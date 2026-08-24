<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The /admin/rooms path for the per-room Discord emoji.
 */
class RoomCrudEmojiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Accept', 'application/json');
    }

    public function test_the_migration_seeds_an_emoji_for_every_room(): void
    {
        $this->assertSame(0, Room::whereNull('emoji')->count());
        $this->assertSame('🍷', Room::where('code', 'CAVE')->value('emoji'));
        $this->assertSame('🏠', Room::where('code', 'HOTE')->value('emoji'));
        // 🏛️ carries a variation selector — proof the column survives a multi-code-point emoji.
        $this->assertSame('🏛️', Room::where('code', 'MSO1')->value('emoji'));
    }

    public function test_the_three_centre_social_rooms_share_one_emoji(): void
    {
        $emojis = Room::whereIn('code', ['CSb1', 'CSb2', 'CSsm'])->pluck('emoji')->all();

        $this->assertSame(['🏢', '🏢', '🏢'], $emojis);
    }

    public function test_an_admin_can_set_the_emoji(): void
    {
        $room = Room::where('code', 'CAVE')->firstOrFail();

        $this->actingAs($this->admin())
            ->putJson("/api/rooms/{$room->id}", ['emoji' => '🕯️'])
            ->assertOk()
            ->assertJsonPath('emoji', '🕯️');

        $this->assertSame('🕯️', $room->fresh()->emoji);
    }

    public function test_an_admin_can_clear_the_emoji(): void
    {
        $room = Room::where('code', 'CAVE')->firstOrFail();

        $this->actingAs($this->admin())
            ->putJson("/api/rooms/{$room->id}", ['emoji' => null])
            ->assertOk();

        $this->assertNull($room->fresh()->emoji);
    }

    public function test_the_emoji_survives_a_create(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/rooms', [
                'code'  => 'TEST',
                'name'  => 'Salle de test',
                'color' => '#123456',
                'emoji' => '🎲',
            ])
            ->assertCreated()
            ->assertJsonPath('emoji', '🎲');

        $this->assertSame('🎲', Room::where('code', 'TEST')->value('emoji'));
    }

    public function test_an_over_long_emoji_is_rejected(): void
    {
        $room = Room::where('code', 'CAVE')->firstOrFail();

        $this->actingAs($this->admin())
            ->putJson("/api/rooms/{$room->id}", ['emoji' => str_repeat('a', 17)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('emoji');

        $this->assertSame('🍷', $room->fresh()->emoji);
    }

    public function test_a_non_admin_cannot_change_the_emoji(): void
    {
        $room = Room::where('code', 'CAVE')->firstOrFail();

        $user = User::create(['discord_id' => '2', 'name' => 'Joueur', 'roles' => []]);

        $this->actingAs($user)
            ->putJson("/api/rooms/{$room->id}", ['emoji' => '💀'])
            ->assertForbidden();

        $this->assertSame('🍷', $room->fresh()->emoji);
    }

    public function test_the_rooms_index_exposes_the_emoji(): void
    {
        $body = $this->actingAs($this->admin())
            ->getJson('/api/rooms')
            ->assertOk()
            ->json();

        $cave = collect($body)->firstWhere('code', 'CAVE');

        $this->assertSame('🍷', $cave['emoji']);
    }

    /** UserFactory is stale (email/password were dropped by simplify_users_table). */
    private function admin(): User
    {
        return User::create([
            'discord_id' => '1',
            'name'       => 'Patron',
            'roles'      => [(int) config('services.discord.role_id_admin')],
        ]);
    }
}
