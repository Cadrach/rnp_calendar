<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventImage;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EventImageTest extends TestCase
{
    use RefreshDatabase;

    private const THREAD_ID = '1400000000000000001';

    protected function setUp(): void
    {
        parent::setUp();

        // Mirror the axios client: without this, validation failures redirect instead of 422.
        $this->withHeader('Accept', 'application/json');

        // Never let a test reach the real Discord API.
        Http::preventStrayRequests();
    }

    // ---------------------------------------------------------------- upload

    public function test_uploading_creates_one_row_per_returned_attachment(): void
    {
        $event = $this->event();
        $this->fakeDiscord(patchAttachments: [
            $this->attachment('900001', 'goblin.png', width: 800, height: 600),
            $this->attachment('900002', 'cockatrice.png'),
        ]);

        $response = $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [
                UploadedFile::fake()->image('goblin.png'),
                UploadedFile::fake()->image('cockatrice.png'),
            ],
        ]);

        $response->assertCreated();
        $this->assertSame(2, $event->images()->count());

        $first = $event->images()->first();
        $this->assertSame('900001', $first->discord_attachment_id);
        $this->assertSame(self::THREAD_ID, $first->discord_message_id);
        $this->assertSame('goblin.png', $first->filename);
        $this->assertSame(800, $first->width);
        $this->assertSame(600, $first->height);
        // The relation orders by position, so positions must be assigned in upload order.
        $this->assertSame([1, 2], $event->images()->pluck('position')->all());
        $this->assertSame(
            ['goblin.png', 'cockatrice.png'],
            $event->images()->pluck('filename')->all(),
        );
    }

    public function test_no_discord_url_is_ever_persisted(): void
    {
        $event = $this->event();
        $this->fakeDiscord(patchAttachments: [$this->attachment('900001', 'goblin.png')]);

        $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertCreated();

        // The whole point of the design: signed URLs expire, so none may be stored.
        foreach (EventImage::first()->getAttributes() as $column => $value) {
            $this->assertStringNotContainsString('discordapp', (string) $value, "column {$column}");
            $this->assertStringNotContainsString('hm=', (string) $value, "column {$column}");
        }
    }

    public function test_the_upload_is_sent_as_multipart_with_a_keep_and_add_manifest(): void
    {
        $event    = $this->event();
        $existing = $this->existingImage($event, '900000');
        $this->fakeDiscord(patchAttachments: [
            $this->attachment('900000', 'old.png'),
            $this->attachment('900001', 'goblin.png'),
        ]);

        $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertCreated();

        Http::assertSent(function (ClientRequest $request) {
            if ($request->method() !== 'PATCH') {
                return false;
            }

            $this->assertTrue($request->isMultipart(), 'the upload must be multipart/form-data');

            $parts = collect($request->data())->keyBy('name');

            $this->assertSame(
                ['attachments' => [['id' => '900000'], ['id' => 0, 'filename' => 'goblin.png']]],
                json_decode($parts['payload_json']['contents'], true),
                'the manifest must keep the existing id and reference the new file by its files[n] index',
            );
            $this->assertSame('goblin.png', $parts['files[0]']['filename']);
            $this->assertNotEmpty($parts['files[0]']['contents']);

            // Content/flags are deliberately absent so the message body is untouched.
            $payload = json_decode($parts['payload_json']['contents'], true);
            $this->assertArrayNotHasKey('content', $payload);
            $this->assertArrayNotHasKey('flags', $payload);

            return true;
        });

        $this->assertSame(2, $event->images()->count());
        $this->assertTrue($existing->exists());
    }

    public function test_the_filename_sent_to_discord_is_sanitised(): void
    {
        $event = $this->event();
        $this->fakeDiscord(patchAttachments: [$this->attachment('900001', 'mon-gobelin-affreux.png')]);

        $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('Mon Gobelin  Affreux!.png')],
        ])->assertCreated();

        Http::assertSent(function (ClientRequest $request) {
            if ($request->method() !== 'PATCH') {
                return false;
            }

            $parts = collect($request->data())->keyBy('name');

            return $parts['files[0]']['filename'] === 'mon-gobelin-affreux.png';
        });
    }

    // ------------------------------------------------------------- rejections

    public function test_a_stranger_cannot_upload(): void
    {
        $event = $this->event();
        Http::fake();

        $stranger = User::create(['discord_id' => '999', 'name' => 'Passant', 'roles' => []]);

        $this->actingAs($stranger)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertForbidden();

        Http::assertNothingSent();
        $this->assertSame(0, EventImage::count());
    }

    public function test_an_admin_who_is_not_the_mj_can_upload(): void
    {
        $event = $this->event();
        $this->fakeDiscord(patchAttachments: [$this->attachment('900001', 'goblin.png')]);

        $admin = User::create([
            'discord_id' => '999',
            'name'       => 'Patron',
            'roles'      => [(int) config('services.discord.role_id_admin')],
        ]);

        $this->actingAs($admin)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertCreated();
    }

    public function test_a_closed_event_rejects_uploads(): void
    {
        $event = $this->event(['is_closed' => true]);
        Http::fake();

        $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_an_event_without_a_discord_post_rejects_uploads(): void
    {
        $event = $this->event(['discord_thread_id' => null]);
        Http::fake();

        $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_the_eleventh_image_is_rejected(): void
    {
        $event = $this->event();
        Http::fake();

        for ($i = 0; $i < 10; $i++) {
            $this->existingImage($event, '9000' . $i);
        }

        $this->actingAsMj($event)->post("/api/events/{$event->id}/images", [
            'images' => [UploadedFile::fake()->image('goblin.png')],
        ])->assertStatus(422);

        Http::assertNothingSent();
        $this->assertSame(10, $event->images()->count());
    }

    public function test_more_than_ten_images_at_once_fails_validation(): void
    {
        $event = $this->event();
        Http::fake();

        $files = array_map(fn ($i) => UploadedFile::fake()->image("art{$i}.png"), range(1, 11));

        $this->actingAsMj($event)
            ->post("/api/events/{$event->id}/images", ['images' => $files])
            ->assertStatus(422)
            ->assertJsonValidationErrors('images');

        Http::assertNothingSent();
    }

    public function test_a_non_image_file_fails_validation(): void
    {
        $event = $this->event();
        Http::fake();

        $this->actingAsMj($event)
            ->post("/api/events/{$event->id}/images", [
                'images' => [UploadedFile::fake()->create('piege.pdf', 10, 'application/pdf')],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('images.0');

        Http::assertNothingSent();
    }

    // ---------------------------------------------------------------- display

    public function test_the_display_route_redirects_to_a_freshly_signed_url(): void
    {
        $event = $this->event();
        $image = $this->existingImage($event, '900001');
        $this->fakeDiscord(getAttachments: [$this->attachment('900001', 'goblin.png')]);

        $response = $this->get("/api/images/{$image->slug}");

        $response->assertRedirect($this->signedUrl('900001', 'goblin.png'));
        $response->assertHeader('Cache-Control', 'max-age=3600, private');
    }

    public function test_the_display_route_needs_no_session_cookie(): void
    {
        // An <img> is a cross-site subresource: a SameSite=lax session cookie is never sent, so this
        // route must work fully unauthenticated.
        $event = $this->event();
        $image = $this->existingImage($event, '900001');
        $this->fakeDiscord(getAttachments: [$this->attachment('900001', 'goblin.png')]);

        $this->assertGuest();
        $this->get("/api/images/{$image->slug}")->assertRedirect();
    }

    public function test_two_images_on_one_event_share_a_single_discord_call(): void
    {
        $event  = $this->event();
        $first  = $this->existingImage($event, '900001');
        $second = $this->existingImage($event, '900002');
        $this->fakeDiscord(getAttachments: [
            $this->attachment('900001', 'goblin.png'),
            $this->attachment('900002', 'cockatrice.png'),
        ]);

        $this->get("/api/images/{$first->slug}")->assertRedirect($this->signedUrl('900001', 'goblin.png'));
        $this->get("/api/images/{$second->slug}")->assertRedirect($this->signedUrl('900002', 'cockatrice.png'));

        // One getMessage covers every attachment on the post; the second hit is served from cache.
        Http::assertSentCount(1);
    }

    public function test_an_unknown_slug_is_a_404(): void
    {
        Http::fake();

        $this->get('/api/images/' . str_repeat('z', 32))->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_an_image_of_a_cancelled_event_is_a_404(): void
    {
        // Events are soft-deleted, so the row outlives the relation.
        $event = $this->event();
        $image = $this->existingImage($event, '900001');
        Http::fake();

        $event->delete();

        $this->get("/api/images/{$image->slug}")->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_an_attachment_deleted_on_discord_is_a_404(): void
    {
        $event = $this->event();
        $image = $this->existingImage($event, '900001');
        // Discord no longer reports that attachment — someone removed it by hand.
        $this->fakeDiscord(getAttachments: []);

        $this->get("/api/images/{$image->slug}")->assertNotFound();
    }

    // ---------------------------------------------------------------- delete

    public function test_deleting_sends_the_reduced_keep_list_and_drops_the_row(): void
    {
        $event  = $this->event();
        $keep   = $this->existingImage($event, '900001');
        $remove = $this->existingImage($event, '900002');
        $this->fakeDiscord(patchAttachments: [$this->attachment('900001', 'goblin.png')]);

        $this->actingAsMj($event)
            ->delete("/api/events/{$event->id}/images/{$remove->id}")
            ->assertOk();

        Http::assertSent(function (ClientRequest $request) {
            if ($request->method() !== 'PATCH') {
                return false;
            }

            // No new bytes to send, so this is a plain JSON edit rather than multipart.
            $this->assertFalse($request->isMultipart());
            $this->assertSame(['attachments' => [['id' => '900001']]], $request->data());

            return true;
        });

        $this->assertNull($remove->fresh());
        $this->assertNotNull($keep->fresh());
    }

    public function test_a_stranger_cannot_delete(): void
    {
        $event = $this->event();
        $image = $this->existingImage($event, '900001');
        Http::fake();

        $stranger = User::create(['discord_id' => '999', 'name' => 'Passant', 'roles' => []]);

        $this->actingAs($stranger)
            ->delete("/api/events/{$event->id}/images/{$image->id}")
            ->assertForbidden();

        Http::assertNothingSent();
        $this->assertNotNull($image->fresh());
    }

    public function test_an_image_belonging_to_another_event_is_a_404(): void
    {
        $event = $this->event();
        $other = $this->event();
        $image = $this->existingImage($other, '900001');
        Http::fake();

        $this->actingAsMj($event)
            ->delete("/api/events/{$event->id}/images/{$image->id}")
            ->assertNotFound();

        Http::assertNothingSent();
        $this->assertNotNull($image->fresh());
    }

    // ---------------------------------------------------------------- payload

    public function test_images_are_included_on_the_event_payload_with_a_stable_url(): void
    {
        $event = $this->event();
        $image = $this->existingImage($event, '900001');
        Http::fake();

        // Both routes matter: EventShowModal reads the index cache before falling back to show.
        foreach (["/api/events/{$event->id}", '/api/events'] as $url) {
            $body = $this->actingAsMj($event)->getJson($url)->assertOk()->json();
            $payload = array_is_list($body) ? $body[0] : $body;

            $this->assertSame($image->slug, $payload['images'][0]['slug']);
            $this->assertSame(url("/api/images/{$image->slug}"), $payload['images'][0]['url']);
            // Discord plumbing stays server-side.
            $this->assertArrayNotHasKey('discord_attachment_id', $payload['images'][0]);
            $this->assertArrayNotHasKey('discord_message_id', $payload['images'][0]);
        }

        Http::assertNothingSent();
    }

    // ---------------------------------------------------------------- helpers

    private function event(array $attributes = []): Event
    {
        return Event::create(array_merge([
            'datetime_start'    => '2026-09-05 17:00:00',
            'datetime_end'      => '2026-09-05 22:00:00',
            'mj_discord_id'     => '1',
            'room_id'           => Room::where('code', 'BAR')->value('id'),
            'game_id'           => 1,
            'discord_thread_id' => self::THREAD_ID,
        ], $attributes));
    }

    /** UserFactory is stale (it still sets email/password, dropped by simplify_users_table). */
    private function actingAsMj(Event $event): static
    {
        return $this->actingAs(User::firstOrCreate(
            ['discord_id' => $event->mj_discord_id],
            ['name' => 'Test MJ', 'roles' => []],
        ));
    }

    private function existingImage(Event $event, string $attachmentId): EventImage
    {
        return $event->images()->create([
            'slug'                  => str_pad($attachmentId, 32, 'x'),
            'discord_message_id'    => self::THREAD_ID,
            'discord_attachment_id' => $attachmentId,
            'filename'              => "art-{$attachmentId}.png",
            'position'              => $event->images()->count() + 1,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $patchAttachments  attachments the edit returns
     * @param  array<int, array<string, mixed>>|null  $getAttachments    attachments a re-fetch returns
     */
    private function fakeDiscord(?array $patchAttachments = null, ?array $getAttachments = null): void
    {
        Http::fake(function (ClientRequest $request) use ($patchAttachments, $getAttachments) {
            $attachments = $request->method() === 'PATCH'
                ? ($patchAttachments ?? [])
                : ($getAttachments ?? $patchAttachments ?? []);

            return Http::response(['id' => self::THREAD_ID, 'attachments' => $attachments]);
        });
    }

    /** Mirrors a real Discord attachment object, signed URL included. */
    private function attachment(string $id, string $filename, ?int $width = null, ?int $height = null): array
    {
        return [
            'id'           => $id,
            'filename'     => $filename,
            'content_type' => 'image/png',
            'size'         => 12345,
            'width'        => $width,
            'height'       => $height,
            'url'          => $this->signedUrl($id, $filename),
        ];
    }

    private function signedUrl(string $attachmentId, string $filename): string
    {
        $ex = dechex(time() + 86400);

        return "https://cdn.discordapp.com/attachments/" . self::THREAD_ID . "/{$attachmentId}/{$filename}"
            . "?ex={$ex}&is=" . dechex(time()) . '&hm=deadbeef';
    }
}
