<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Room;
use App\Services\EventDiscordSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Covers the call-to-action at the bottom of a séance's forum post.
 */
class EventDiscordSyncTest extends TestCase
{
    use RefreshDatabase;

    private const THREAD_ID = '1400000000000000001';

    private const REGISTER_LABEL = "S'inscrire à cette séance";
    private const CALENDAR_LABEL = 'Voir sur le calendrier';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake(fn () => Http::response(['id' => self::THREAD_ID, 'attachments' => []]));
    }

    public function test_an_open_seance_invites_registration(): void
    {
        $content = $this->syncedContent($this->event(['max_players' => 4]));

        $this->assertStringContainsString(self::REGISTER_LABEL, $content);
        $this->assertStringNotContainsString(self::CALENDAR_LABEL, $content);
        $this->assertStringContainsString($this->expectedUrl(), $content);
    }

    public function test_a_seance_with_no_player_cap_is_never_full(): void
    {
        $content = $this->syncedContent($this->event([
            'max_players' => null,
            'player_ids'  => ['1', '2', '3', '4', '5'],
        ]));

        $this->assertStringContainsString(self::REGISTER_LABEL, $content);
    }

    public function test_a_full_seance_links_to_the_calendar_instead(): void
    {
        $content = $this->syncedContent($this->event([
            'max_players' => 2,
            'player_ids'  => ['1', '2'],
        ]));

        $this->assertStringContainsString(self::CALENDAR_LABEL, $content);
        $this->assertStringNotContainsString(self::REGISTER_LABEL, $content);
        // Same destination — only the wording changes.
        $this->assertStringContainsString($this->expectedUrl(), $content);
    }

    public function test_an_over_subscribed_seance_also_links_to_the_calendar(): void
    {
        $content = $this->syncedContent($this->event([
            'max_players' => 2,
            'player_ids'  => ['1', '2', '3'],
        ]));

        $this->assertStringContainsString(self::CALENDAR_LABEL, $content);
        $this->assertStringNotContainsString(self::REGISTER_LABEL, $content);
    }

    public function test_a_cancelled_seance_carries_no_link_at_all(): void
    {
        // It is soft-deleted straight after cancel(), so any link would 404.
        $event = $this->event(['max_players' => 4]);

        app(EventDiscordSync::class)->cancel($event);

        $content = $this->lastEditedContent();

        $this->assertStringNotContainsString(self::REGISTER_LABEL, $content);
        $this->assertStringNotContainsString(self::CALENDAR_LABEL, $content);
        $this->assertStringNotContainsString('/show/', $content);
    }

    // ------------------------------------------------------- room emoji prefix

    public function test_the_thread_name_is_prefixed_with_the_rooms_emoji(): void
    {
        $event = $this->event(['room_id' => $this->room('CAVE')->id]);

        app(EventDiscordSync::class)->sync($event);

        $this->assertStringStartsWith('🍷 CAVE ', $this->lastThreadName());
    }

    public function test_the_post_body_heading_carries_no_emoji(): void
    {
        // The whole reason buildThreadName() is separate from buildTitle(): the body already spells
        // the room out on its own Salle line.
        $content = $this->syncedContent($this->event(['room_id' => $this->room('CAVE')->id]));

        $this->assertStringContainsString('## CAVE ', $content);
        $this->assertStringNotContainsString('🍷', $content);
    }

    public function test_a_room_without_an_emoji_yields_the_bare_title(): void
    {
        $room = $this->room('CAVE');
        $room->update(['emoji' => null]);

        app(EventDiscordSync::class)->sync($this->event(['room_id' => $room->id]));

        $name = $this->lastThreadName();

        $this->assertStringStartsWith('CAVE ', $name);
        $this->assertSame(ltrim($name), $name, 'no stray leading space');
    }

    public function test_a_blank_emoji_is_treated_as_none(): void
    {
        $room = $this->room('CAVE');
        $room->update(['emoji' => '   ']);

        app(EventDiscordSync::class)->sync($this->event(['room_id' => $room->id]));

        $this->assertStringStartsWith('CAVE ', $this->lastThreadName());
    }

    public function test_a_cancelled_seance_keeps_the_emoji_after_the_marker(): void
    {
        $event = $this->event(['room_id' => $this->room('CAVE')->id]);

        app(EventDiscordSync::class)->cancel($event);

        $this->assertStringStartsWith('[ANNULÉ] 🍷 CAVE ', $this->lastThreadName());
    }

    public function test_changing_the_room_changes_the_emoji(): void
    {
        $event = $this->event(['room_id' => $this->room('CAVE')->id]);
        app(EventDiscordSync::class)->sync($event);
        $this->assertStringStartsWith('🍷 CAVE ', $this->lastThreadName());

        $event->update(['room_id' => $this->room('BAR')->id]);
        app(EventDiscordSync::class)->sync($event);
        $this->assertStringStartsWith('🍺 BAR ', $this->lastThreadName());
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

    private function syncedContent(Event $event): string
    {
        app(EventDiscordSync::class)->sync($event);

        return $this->lastEditedContent();
    }

    /** The starter-message edit is the only call that carries a `content` field. */
    private function lastEditedContent(): string
    {
        $content = null;

        Http::assertSent(function (ClientRequest $request) use (&$content) {
            $body = $request->data();

            if (($body['content'] ?? null) !== null) {
                $content = $body['content'];
            }

            return true;
        });

        $this->assertNotNull($content, 'expected an edit carrying the message content');

        return $content;
    }

    private function room(string $code): Room
    {
        return Room::where('code', $code)->firstOrFail();
    }

    /** editThread / createForumThread are the only calls carrying a `name` field. */
    private function lastThreadName(): string
    {
        $name = null;

        Http::assertSent(function (ClientRequest $request) use (&$name) {
            $body = $request->data();

            if (($body['name'] ?? null) !== null) {
                $name = $body['name'];
            }

            return true;
        });

        $this->assertNotNull($name, 'expected a call carrying the thread name');

        return $name;
    }

    private function expectedUrl(): string
    {
        return rtrim(config('app.frontend_url'), '/') . '/show/' . Event::max('id');
    }
}
