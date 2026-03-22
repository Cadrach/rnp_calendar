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

        if (! $this->isWithinAvailableHours($room, $start, $end)) {
            throw ValidationException::withMessages([
                'datetime_start' => ['The requested time is not within the room\'s available hours.'],
            ]);
        }

        if ($this->hasOverlap($room, $start, $end, $excludeEventId)) {
            throw ValidationException::withMessages([
                'datetime_start' => ['The room is already booked during the requested period.'],
            ]);
        }
    }

    /**
     * Returns true if the room is available for the given interval:
     * within its effective available hours and not already booked.
     * Unlimited rooms always return true.
     */
    public function isAvailable(Room $room, Carbon $start, Carbon $end, ?int $excludeEventId = null): bool
    {
        if ($room->unlimited) {
            return true;
        }

        return $this->isWithinAvailableHours($room, $start, $end)
            && ! $this->hasOverlap($room, $start, $end, $excludeEventId);
    }

    /**
     * Resolves effective availability for the room and verifies the requested interval is fully
     * contained within one of the resulting slots.
     * Converts to club timezone before computing startOfDay so we get the correct local
     * calendar day, not the UTC day (which may differ near midnight).
     */
    private function isWithinAvailableHours(Room $room, Carbon $start, Carbon $end): bool
    {
        $tz         = config('app.club_timezone');
        $localStart = $start->copy()->setTimezone($tz);
        $localEnd   = $end->copy()->setTimezone($tz);

        $effective = $this->resolver->resolve($room, $localStart->startOfDay(), $localEnd->startOfDay());
        $requested = new TimeInterval($start, $end);

        foreach ($effective as $slot) {
            if ($slot->contains($requested)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns true if any existing active event for the same room overlaps [$start, $end].
     * Uses the standard half-open interval overlap test: existing.start < end && existing.end > start.
     * Soft-deleted events are excluded automatically by Eloquent's global scope.
     */
    private function hasOverlap(Room $room, Carbon $start, Carbon $end, ?int $excludeEventId): bool
    {
        return Event::where('room_id', $room->id)
            ->when($excludeEventId !== null, fn ($q) => $q->where('id', '!=', $excludeEventId))
            ->where('datetime_start', '<', $end)
            ->where('datetime_end', '>', $start)
            ->exists();
    }
}
