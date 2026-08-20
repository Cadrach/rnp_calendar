<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Services\Availability\AvailabilityResolver;
use App\Services\Availability\EventBookingValidator;
use App\Services\Availability\FreeSlotResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function __construct(
        private readonly AvailabilityResolver  $resolver,
        private readonly EventBookingValidator $bookingValidator,
        private readonly FreeSlotResolver      $freeSlotResolver,
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
     * Returns the free (unbooked) time slots for a room on a given date.
     *
     * Query params:
     *   - date:     Y-m-d   (required) — range start day, in club timezone
     *   - end_date: Y-m-d   (optional) — range end day, inclusive (defaults to date); use for multi-day slots
     *   - event_id: integer (optional) — exclude this event from the overlap check (editing flow)
     *
     * Unlimited rooms bypass every booking check, so the whole range is returned as a single slot
     * with no event subtraction at all — consistent with EventBookingValidator, which accepts any
     * interval for them.
     * For constrained rooms, effective availability is computed first, then booked events are subtracted.
     *
     * All boundaries are serialized in the club timezone so a slot never mixes offsets.
     */
    public function freeSlots(Request $request, Room $room): JsonResponse
    {
        // Rules stay inline rather than shared with EventController via a constant: Scramble reads
        // them statically, and anything it cannot evaluate drops the whole operation from the spec.
        $request->validate([
            'date'     => ['required', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
        ]);

        [$rangeStart, $rangeEnd] = $this->freeSlotResolver->range(
            $request->input('date'),
            $request->input('end_date'),
        );

        $slots = $this->freeSlotResolver->forRoom(
            $room,
            $rangeStart,
            $rangeEnd,
            $request->integer('event_id') ?: null,
        );

        return response()->json($this->freeSlotResolver->toArray($slots));
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
