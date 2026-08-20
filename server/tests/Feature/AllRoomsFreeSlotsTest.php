<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * GET /api/events/free-slots — the all-rooms counterpart of rooms/{room}/free-slots.
 */
class AllRoomsFreeSlotsTest extends TestCase
{
    use RefreshDatabase;

    private const TZ = 'Europe/Paris';

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.club_timezone' => self::TZ]);
        $this->withHeader('Accept', 'application/json');

        // UserFactory is stale (email/password were dropped by simplify_users_table).
        $this->actingAs(User::create([
            'discord_id' => '1',
            'name'       => 'Test MJ',
            'roles'      => [],
        ]));
    }

    public function test_the_route_is_not_swallowed_by_the_events_resource(): void
    {
        // GET events/{event} would match "free-slots" and 404 on route-model binding.
        $this->getJson('/api/events/free-slots?date=2026-08-22')->assertOk();
    }

    public function test_it_returns_every_bookable_room_and_excludes_unlimited_ones(): void
    {
        $body = $this->slots(['date' => '2026-08-22']);

        $returned = collect($body)->pluck('room_id')->sort()->values()->all();
        $expected = Room::where('unlimited', false)->orderBy('id')->pluck('id')->all();

        $this->assertSame($expected, $returned);

        $hote = Room::where('code', 'HOTE')->firstOrFail();
        $this->assertTrue($hote->unlimited);
        $this->assertNotContains($hote->id, $returned, 'unlimited rooms carry no meaningful slots');
    }

    public function test_each_room_reports_its_own_seeded_availability(): void
    {
        // Seeded rules: available daily 14:00–23:00, unavailable Wednesday 14:00–18:00.
        // 2026-08-22 is a Saturday, so the whole window is free.
        $body = $this->slots(['date' => '2026-08-22']);

        foreach ($body as $row) {
            $this->assertSame([
                ['start' => '2026-08-22T14:00:00+02:00', 'end' => '2026-08-22T23:00:00+02:00'],
            ], $row['slots'], "room {$row['room_id']}");
        }
    }

    public function test_a_booked_event_only_shrinks_its_own_room(): void
    {
        $room = Room::where('code', 'BAR')->firstOrFail();
        // 19:00 -> 21:00 club time, stored in UTC.
        $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 19:00:00');

        $body = collect($this->slots(['date' => '2026-08-22']))->keyBy('room_id');

        $this->assertSame([
            ['start' => '2026-08-22T14:00:00+02:00', 'end' => '2026-08-22T19:00:00+02:00'],
            ['start' => '2026-08-22T21:00:00+02:00', 'end' => '2026-08-22T23:00:00+02:00'],
        ], $body[$room->id]['slots']);

        $other = Room::where('code', 'CAVE')->firstOrFail();
        $this->assertSame([
            ['start' => '2026-08-22T14:00:00+02:00', 'end' => '2026-08-22T23:00:00+02:00'],
        ], $body[$other->id]['slots']);
    }

    public function test_a_fully_booked_room_is_listed_with_an_empty_slot_array(): void
    {
        $room = Room::where('code', 'BAR')->firstOrFail();
        // Covers the entire 14:00–23:00 window.
        $this->bookEvent($room, '2026-08-22 12:00:00', '2026-08-22 21:00:00');

        $body = collect($this->slots(['date' => '2026-08-22']))->keyBy('room_id');

        $this->assertArrayHasKey($room->id, $body->all(), 'the room must still be reported');
        $this->assertSame([], $body[$room->id]['slots']);
    }

    public function test_event_id_is_excluded_from_the_overlap_check(): void
    {
        $room  = Room::where('code', 'BAR')->firstOrFail();
        $event = $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 19:00:00');

        $body = collect($this->slots(['date' => '2026-08-22', 'event_id' => $event->id]))
            ->keyBy('room_id');

        $this->assertSame([
            ['start' => '2026-08-22T14:00:00+02:00', 'end' => '2026-08-22T23:00:00+02:00'],
        ], $body[$room->id]['slots']);
    }

    public function test_it_matches_the_per_room_endpoint_exactly(): void
    {
        // The whole point of sharing FreeSlotResolver: the two endpoints cannot drift.
        $room = Room::where('code', 'BAR')->firstOrFail();
        $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 19:00:00');

        $query = 'date=2026-08-22&end_date=2026-08-23';

        $all = collect($this->getJson("/api/events/free-slots?{$query}")->assertOk()->json())
            ->keyBy('room_id');

        foreach (Room::where('unlimited', false)->get() as $each) {
            $perRoom = $this->getJson("/api/rooms/{$each->id}/free-slots?{$query}")->assertOk()->json();

            $this->assertSame($perRoom, $all[$each->id]['slots'], "room {$each->code}");
        }
    }

    public function test_a_multi_day_range_reports_one_slot_per_day(): void
    {
        $body = collect($this->slots(['date' => '2026-08-22', 'end_date' => '2026-08-23']))
            ->keyBy('room_id');
        $room = Room::where('code', 'BAR')->firstOrFail();

        $this->assertSame([
            ['start' => '2026-08-22T14:00:00+02:00', 'end' => '2026-08-22T23:00:00+02:00'],
            ['start' => '2026-08-23T14:00:00+02:00', 'end' => '2026-08-23T23:00:00+02:00'],
        ], $body[$room->id]['slots']);
    }

    public function test_the_wednesday_closure_is_honoured(): void
    {
        // 2026-08-26 is a Wednesday: the seeded rule blocks 14:00–18:00.
        $body = collect($this->slots(['date' => '2026-08-26']))->keyBy('room_id');
        $room = Room::where('code', 'BAR')->firstOrFail();

        $this->assertSame([
            ['start' => '2026-08-26T18:00:00+02:00', 'end' => '2026-08-26T23:00:00+02:00'],
        ], $body[$room->id]['slots']);
    }

    public function test_it_issues_a_single_events_query_for_all_rooms(): void
    {
        $this->bookEvent(Room::where('code', 'BAR')->firstOrFail(), '2026-08-22 17:00:00', '2026-08-22 19:00:00');

        // Match the batched lookup specifically: `room_id` in (...). The GcClosePastEvents
        // middleware also queries events, and that one is none of this test's business.
        $queries = 0;
        DB::listen(function ($query) use (&$queries) {
            // Quoting differs by driver (sqlite in tests, mysql in prod), so match either.
            if (str_contains($query->sql, 'events') && preg_match('/room_id["`]? in \(/', $query->sql)) {
                $queries++;
            }
        });

        $this->slots(['date' => '2026-08-22']);

        $this->assertSame(1, $queries, 'the events lookup must be batched across rooms');
    }

    public function test_validation_mirrors_the_per_room_endpoint(): void
    {
        $this->getJson('/api/events/free-slots')->assertStatus(422)
            ->assertJsonValidationErrors('date');

        $this->getJson('/api/events/free-slots?date=22-08-2026')->assertStatus(422)
            ->assertJsonValidationErrors('date');

        $this->getJson('/api/events/free-slots?date=2026-08-22&end_date=2026-08-21')
            ->assertStatus(422)->assertJsonValidationErrors('end_date');

        $this->getJson('/api/events/free-slots?date=2026-08-22&event_id=999999')
            ->assertStatus(422)->assertJsonValidationErrors('event_id');
    }

    public function test_it_requires_authentication(): void
    {
        auth()->logout();

        $this->getJson('/api/events/free-slots?date=2026-08-22')->assertUnauthorized();
    }

    // ---------------------------------------------------------------- helpers

    private function slots(array $query): array
    {
        return $this->getJson('/api/events/free-slots?'.http_build_query($query))
            ->assertOk()
            ->json();
    }

    /** $start / $end are UTC wall clock, matching how the columns are stored. */
    private function bookEvent(Room $room, string $startUtc, string $endUtc): Event
    {
        return Event::create([
            'datetime_start' => Carbon::parse($startUtc, 'UTC'),
            'datetime_end'   => Carbon::parse($endUtc, 'UTC'),
            'mj_discord_id'  => '1',
            'room_id'        => $room->id,
            'game_id'        => 1,
        ]);
    }
}
