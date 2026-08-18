<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Room;
use App\Models\RoomRule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomFreeSlotsTest extends TestCase
{
    use RefreshDatabase;

    private const TZ = 'Europe/Paris';

    protected function setUp(): void
    {
        parent::setUp();

        // Pinned so the suite does not depend on CLUB_TIMEZONE in .env.
        config(['app.club_timezone' => self::TZ]);

        // UserFactory still references email/password, dropped by simplify_users_table.
        $this->actingAs(User::create([
            'discord_id' => '1',
            'name'       => 'Test MJ',
            'roles'      => [],
        ]));
    }

    public function test_unlimited_room_returns_the_full_range_ignoring_booked_events(): void
    {
        $room = $this->unlimitedRoom();
        $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 22:00:00');

        $slots = $this->freeSlots($room, ['date' => '2026-08-22', 'end_date' => '2026-08-22']);

        $this->assertSame([[
            'start' => '2026-08-22T00:00:00+02:00',
            'end'   => '2026-08-22T23:59:59+02:00',
        ]], $slots);
    }

    public function test_unlimited_room_full_range_survives_an_excluded_event(): void
    {
        // The reported payload: the event being edited is excluded while another one still overlaps.
        $room    = $this->unlimitedRoom();
        $editing = $this->bookEvent($room, '2026-08-22 12:00:00', '2026-08-22 15:00:00');
        $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 22:00:00');

        $slots = $this->freeSlots($room, [
            'date'     => '2026-08-22',
            'end_date' => '2026-08-22',
            'event_id' => $editing->id,
        ]);

        $this->assertSame([[
            'start' => '2026-08-22T00:00:00+02:00',
            'end'   => '2026-08-22T23:59:59+02:00',
        ]], $slots);
    }

    public function test_unlimited_room_spans_a_multi_day_range(): void
    {
        $slots = $this->freeSlots($this->unlimitedRoom(), [
            'date'     => '2026-08-22',
            'end_date' => '2026-08-23',
        ]);

        $this->assertSame([[
            'start' => '2026-08-22T00:00:00+02:00',
            'end'   => '2026-08-23T23:59:59+02:00',
        ]], $slots);
    }

    public function test_a_slot_split_by_an_event_keeps_a_single_offset(): void
    {
        $room = $this->constrainedRoom('14:00:00', '23:00:00');
        // 19:00 -> 21:00 club time, stored in UTC.
        $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 19:00:00');

        $slots = $this->freeSlots($room, ['date' => '2026-08-22']);

        $this->assertSame([
            ['start' => '2026-08-22T14:00:00+02:00', 'end' => '2026-08-22T19:00:00+02:00'],
            ['start' => '2026-08-22T21:00:00+02:00', 'end' => '2026-08-22T23:00:00+02:00'],
        ], $slots);

        // Guards the reported bug directly: the split boundary used to come back as +00:00.
        foreach ($slots as $slot) {
            $this->assertStringEndsWith('+02:00', $slot['start']);
            $this->assertStringEndsWith('+02:00', $slot['end']);
        }
    }

    public function test_an_overnight_event_from_the_previous_evening_is_subtracted(): void
    {
        $room = $this->constrainedRoom('00:00:00', '23:00:00');
        // 21 Aug 19:00 -> 22 Aug 01:00 club time; both timestamps land on the 21st in UTC,
        // so a club-timezone query window misses this event entirely.
        $this->bookEvent($room, '2026-08-21 17:00:00', '2026-08-21 23:00:00');

        $slots = $this->freeSlots($room, ['date' => '2026-08-22']);

        $this->assertSame([[
            'start' => '2026-08-22T01:00:00+02:00',
            'end'   => '2026-08-22T23:00:00+02:00',
        ]], $slots);
    }

    public function test_an_event_on_the_next_club_day_is_not_subtracted(): void
    {
        $room = $this->constrainedRoom('00:00:00', '23:00:00');
        // 23 Aug 02:00 -> 04:00 club time — inside the naive UTC window but on the next club day.
        $this->bookEvent($room, '2026-08-23 00:00:00', '2026-08-23 02:00:00');

        $slots = $this->freeSlots($room, ['date' => '2026-08-22']);

        $this->assertSame([[
            'start' => '2026-08-22T00:00:00+02:00',
            'end'   => '2026-08-22T23:00:00+02:00',
        ]], $slots);
    }

    public function test_the_edited_event_is_excluded_from_the_subtraction(): void
    {
        $room  = $this->constrainedRoom('14:00:00', '23:00:00');
        $event = $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 19:00:00');

        $slots = $this->freeSlots($room, ['date' => '2026-08-22', 'event_id' => $event->id]);

        $this->assertSame([[
            'start' => '2026-08-22T14:00:00+02:00',
            'end'   => '2026-08-22T23:00:00+02:00',
        ]], $slots);
    }

    public function test_soft_deleted_events_are_not_subtracted(): void
    {
        $room = $this->constrainedRoom('14:00:00', '23:00:00');
        $this->bookEvent($room, '2026-08-22 17:00:00', '2026-08-22 19:00:00')->delete();

        $slots = $this->freeSlots($room, ['date' => '2026-08-22']);

        $this->assertSame([[
            'start' => '2026-08-22T14:00:00+02:00',
            'end'   => '2026-08-22T23:00:00+02:00',
        ]], $slots);
    }

    public function test_the_day_dst_ends_legitimately_spans_two_offsets(): void
    {
        // 25 Oct 2026: Europe/Paris drops from +02:00 to +01:00, so this club day has 25 hours.
        // The one case where the two boundaries of a slot must NOT share an offset.
        $this->assertSame('+02:00', Carbon::parse('2026-10-25', self::TZ)->startOfDay()->format('P'));
        $this->assertSame('+01:00', Carbon::parse('2026-10-25', self::TZ)->endOfDay()->format('P'));

        $slots = $this->freeSlots($this->unlimitedRoom(), ['date' => '2026-10-25']);

        $this->assertSame([[
            'start' => '2026-10-25T00:00:00+02:00',
            'end'   => '2026-10-25T23:59:59+01:00',
        ]], $slots);
    }

    public function test_a_room_with_no_available_rule_returns_no_slots(): void
    {
        $room = Room::where('code', 'BAR')->firstOrFail();
        RoomRule::where('room_id', $room->id)->delete();

        $this->assertSame([], $this->freeSlots($room, ['date' => '2026-08-22']));
    }

    /** The migration-seeded unlimited room — id 8, code HOTE, as in the bug report. */
    private function unlimitedRoom(): Room
    {
        $room = Room::where('code', 'HOTE')->firstOrFail();
        $this->assertTrue($room->unlimited);

        return $room;
    }

    /** Replaces the migration-seeded rules with a single daily availability window. */
    private function constrainedRoom(string $startTime, string $endTime): Room
    {
        $room = Room::where('code', 'BAR')->firstOrFail();

        RoomRule::where('room_id', $room->id)->delete();
        RoomRule::create([
            'room_id'    => $room->id,
            'kind'       => RoomRule::KIND_AVAILABLE,
            'scope'      => RoomRule::SCOPE_DAILY,
            'start_time' => $startTime,
            'end_time'   => $endTime,
        ]);

        return $room;
    }

    /** $startUtc / $endUtc are UTC wall clock, matching how the columns are stored. */
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

    private function freeSlots(Room $room, array $query): array
    {
        return $this->getJson("/api/rooms/{$room->id}/free-slots?".http_build_query($query))
            ->assertOk()
            ->json();
    }
}
