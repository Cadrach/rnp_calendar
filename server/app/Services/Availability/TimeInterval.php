<?php

namespace App\Services\Availability;

use Carbon\Carbon;

final readonly class TimeInterval
{
    public function __construct(
        public Carbon $start,
        public Carbon $end,
    )
    {
    }

    /**
     * Returns true if this interval shares any time with $other.
     * Two intervals that only touch at a single point (end == start) are not considered overlapping.
     */
    public function overlaps(self $other): bool
    {
        return $this->start < $other->end && $this->end > $other->start;
    }

    /**
     * Returns true if $other is fully enclosed within this interval (inclusive on both edges).
     * Used to verify that a requested booking sits entirely inside an effective available slot.
     */
    public function contains(self $other): bool
    {
        return $this->start <= $other->start && $this->end >= $other->end;
    }
}
