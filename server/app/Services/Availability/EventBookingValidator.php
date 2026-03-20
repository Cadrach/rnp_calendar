<?php

namespace App\Services\Availability;

use App\Models\Event;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class EventBookingValidator
{
    public function __construct(private readonly AvailabilityResolver $resolver)
    {
    }

    /**
     * Validates that an event can be booked for the given room and time range.
     *
     * Unlimited rooms bypass all checks entirely — they accept any booking without
     * availability or overlap restrictions.
     *
     * For non-unlimited rooms, runs two checks in order:
     *   1. Availability — the requested interval must be fully contained within the room's
     *      effective available hours.
     *   2. Overlap — no existing active event for the same room may overlap the requested time.
     *
     * Pass $excludeEventId when updating an existing event to exclude it from the overlap check.
     *
     * Throws a ValidationException on the first failing check.
     */
    public function validate(Room $room, Carbon $start, Carbon $end, ?int $excludeEventId = null): void
    {
        if ($room->unlimited) {
            return;
        }

        $this->checkAvailability($room, $start, $end);
        $this->checkNoOverlap($room, $start, $end, $excludeEventId);
    }

    /**
     * Resolves effective availability for the room and verifies the requested interval is fully
     * contained within one of the resulting slots. Unlimited rooms bypass this check entirely.
     * Throws ValidationException if no slot contains the request.
     */
    private function checkAvailability(Room $room, Carbon $start, Carbon $end): void
    {
        $effective = $this->resolver->resolve($room, $start->copy()->startOfDay(), $end->copy()->startOfDay());
        $requested = new TimeInterval($start, $end);

        foreach ($effective as $slot) {
            if ($slot->contains($requested)) {
                return;
            }
        }

        throw ValidationException::withMessages([
            'datetime_start' => ['The requested time is not within the room\'s available hours.'],
        ]);
    }

    /**
     * Queries for any existing event on the same room whose time range overlaps [$start, $end].
     * Uses the standard half-open interval overlap test: existing.start < end && existing.end > start.
     * Soft-deleted events are excluded automatically by Eloquent's global scope.
     * Throws ValidationException if an overlap is found.
     */
    private function checkNoOverlap(Room $room, Carbon $start, Carbon $end, ?int $excludeEventId): void
    {
        $overlap = Event::where('room_id', $room->id)
            ->when($excludeEventId !== null, fn ($q) => $q->where('id', '!=', $excludeEventId))
            ->where('datetime_start', '<', $end)
            ->where('datetime_end', '>', $start)
            ->exists();

        if ($overlap) {
            throw ValidationException::withMessages([
                'datetime_start' => ['The room is already booked during the requested period.'],
            ]);
        }
    }
}
