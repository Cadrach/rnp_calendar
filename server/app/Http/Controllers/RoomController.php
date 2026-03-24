<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Room;
use App\Services\Availability\AvailabilityResolver;
use App\Services\Availability\EventBookingValidator;
use App\Services\Availability\TimeInterval;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function __construct(
        private readonly AvailabilityResolver  $resolver,
        private readonly EventBookingValidator $bookingValidator,
    )
    {
    }

    /**
     * Returns all rooms that are available for the given datetime interval.
     *
     * Query params:
     *   - start:    ISO datetime (required) — interval start in UTC
     *   - end:      ISO datetime (required) — interval end in UTC, must be after start
     *   - event_id: integer (optional)      — existing event to exclude from the overlap check (useful when editing)
     *
     * A room is considered available if:
     *   - the interval is fully within its effective available hours (or the room is unlimited), AND
     *   - no existing event overlaps the interval for that room.
     */
    public function availableRooms(Request $request): JsonResponse
    {
        $request->validate([
            'start'    => ['required', 'date'],
            'end'      => ['required', 'date', 'after:start'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
        ]);

        $start       = Carbon::parse($request->input('start'));
        $end         = Carbon::parse($request->input('end'));
        $excludeId   = $request->integer('event_id') ?: null;

        $available = Room::orderBy('name')
            ->get()
            ->filter(fn(Room $room) => $this->bookingValidator->isAvailable($room, $start, $end, $excludeId))
            ->values();

        return response()->json($available);
    }


    /**
     * Returns the effective available intervals for a room over the requested date range.
     *
     * Query params:
     *   - start: Y-m-d  (required) — first day of the range, inclusive
     *   - end:   Y-m-d  (required) — last day of the range, inclusive
     *
     * Response shape mirrors react-big-calendar's event object so the frontend can feed
     * the `intervals` array directly into the `backgroundEvents` prop after mapping
     * each entry's `start`/`end` strings through `new Date()`.
     *
     * For unlimited rooms the entire requested range is returned as a single interval,
     * since no booking restriction applies.
     */
    /**
     * Returns the free (unbooked) time slots for a room on a given date.
     *
     * Query params:
     *   - date:     Y-m-d   (required) — the day to check, in club timezone
     *   - event_id: integer (optional) — exclude this event from the overlap check (editing flow)
     *
     * For unlimited rooms, the full day minus any booked events is returned.
     * For constrained rooms, effective availability is computed first, then booked events are subtracted.
     */
    public function freeSlots(Request $request, Room $room): JsonResponse
    {
        $request->validate([
            'date'     => ['required', 'date_format:Y-m-d'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
        ]);

        $tz        = config('app.club_timezone');
        $day       = Carbon::parse($request->input('date'), $tz)->startOfDay();
        $excludeId = $request->integer('event_id') ?: null;

        if ($room->unlimited) {
            $slots = [new TimeInterval($day->copy(), $day->copy()->endOfDay())];
        } else {
            $slots = $this->resolver->resolve($room, $day->copy(), $day->copy());
        }

        // Subtract booked events for this room on this day
        $events = Event::where('room_id', $room->id)
            ->when($excludeId !== null, fn ($q) => $q->where('id', '!=', $excludeId))
            ->where('datetime_start', '<', $day->copy()->endOfDay())
            ->where('datetime_end', '>', $day->copy()->startOfDay())
            ->get();

        foreach ($events as $event) {
            $booked = new TimeInterval(
                Carbon::parse($event->datetime_start),
                Carbon::parse($event->datetime_end),
            );

            $remaining = [];
            foreach ($slots as $slot) {
                if (! $slot->overlaps($booked)) {
                    $remaining[] = $slot;
                    continue;
                }
                if ($slot->start < $booked->start) {
                    $remaining[] = new TimeInterval($slot->start, $booked->start);
                }
                if ($slot->end > $booked->end) {
                    $remaining[] = new TimeInterval($booked->end, $slot->end);
                }
            }
            $slots = $remaining;
        }

        $result = array_map(fn (TimeInterval $s) => [
            'start' => $s->start->toIso8601String(),
            'end'   => $s->end->toIso8601String(),
        ], $slots);

        return response()->json(array_values($result));
    }

    public function availability(Request $request, Room $room): JsonResponse
    {
        $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
        ]);

        // Parse date strings in the club timezone so that day boundaries match local time.
        $tz = config('app.club_timezone');
        $rangeStart = Carbon::parse($request->input('start'), $tz)->startOfDay();
        $rangeEnd = Carbon::parse($request->input('end'), $tz)->startOfDay();

        if ($room->unlimited) {
            $intervals = [[
                'start' => $rangeStart->toDateTimeString(),
                'end' => $rangeEnd->endOfDay()->toDateTimeString(),
            ]];
        } else {
            $effective = $this->resolver->resolve($room, $rangeStart, $rangeEnd);

            $intervals = array_map(fn($interval) => [
                'start' => $interval->start->toDateTimeString(),
                'end' => $interval->end->toDateTimeString(),
            ], $effective);
        }

        return response()->json([
            'room_id' => $room->id,
            'start' => $request->input('start'),
            'end' => $request->input('end'),
            'intervals' => $intervals,
        ]);
    }
}
