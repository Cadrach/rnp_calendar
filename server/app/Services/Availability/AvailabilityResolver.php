<?php

namespace App\Services\Availability;

use App\Models\Room;
use App\Models\RoomRule;
use Carbon\Carbon;

class AvailabilityResolver
{
    public function __construct(private readonly AvailabilityIntervalExpander $expander)
    {
    }

    /**
     * Computes the effective bookable availability for a room over the given date range.
     *
     * Steps:
     *   1. Load all rules for the room.
     *   2. Expand each rule into concrete TimeIntervals via the expander.
     *   3. Split the resulting intervals into two buckets: available and unavailable.
     *   4. Merge the available intervals (sort + collapse overlaps / adjacencies).
     *   5. Subtract every unavailable interval from the merged available set.
     *
     * The returned array contains only the final bookable slots — unavailable always wins.
     * An empty array means the room has no bookable time in the requested range.
     *
     * @return TimeInterval[]
     */
    public function resolve(Room $room, Carbon $rangeStart, Carbon $rangeEnd): array
    {
        $rules = RoomRule::where('room_id', $room->id)->get();

        $available   = [];
        $unavailable = [];

        foreach ($rules as $rule) {
            $intervals = $this->expander->expand($rule, $rangeStart, $rangeEnd);

            if ($rule->kind === RoomRule::KIND_AVAILABLE) {
                $available = array_merge($available, $intervals);
            } else {
                $unavailable = array_merge($unavailable, $intervals);
            }
        }

        $available = $this->mergeIntervals($available);

        foreach ($unavailable as $block) {
            $available = $this->subtractInterval($available, $block);
        }

        return $available;
    }

    /**
     * Sorts intervals by start time and collapses any that overlap or are directly adjacent.
     * Example: [09:00–11:00] + [10:00–12:00] → [09:00–12:00]
     *
     * @param  TimeInterval[] $intervals
     * @return TimeInterval[]
     */
    private function mergeIntervals(array $intervals): array
    {
        if (empty($intervals)) {
            return [];
        }

        usort($intervals, fn (TimeInterval $a, TimeInterval $b) => $a->start <=> $b->start);

        $merged = [$intervals[0]];

        for ($i = 1; $i < count($intervals); $i++) {
            $curr = $intervals[$i];
            $last = $merged[count($merged) - 1];

            if ($curr->start <= $last->end) {
                if ($curr->end > $last->end) {
                    $merged[count($merged) - 1] = new TimeInterval($last->start, $curr->end);
                }
            } else {
                $merged[] = $curr;
            }
        }

        return $merged;
    }

    /**
     * Removes $block from every slot in $slots, splitting slots as needed.
     *
     * For each available slot:
     *   - If it does not overlap $block, it passes through unchanged.
     *   - If it overlaps, the overlapping portion is removed. Any left or right
     *     remainder is kept as a new, trimmed interval.
     *
     * Example: slot [09:00–12:00], block [10:00–11:00] → [09:00–10:00] + [11:00–12:00]
     *
     * @param  TimeInterval[] $slots
     * @return TimeInterval[]
     */
    private function subtractInterval(array $slots, TimeInterval $block): array
    {
        $result = [];

        foreach ($slots as $slot) {
            if (! $slot->overlaps($block)) {
                $result[] = $slot;
                continue;
            }

            if ($slot->start < $block->start) {
                $result[] = new TimeInterval($slot->start, $block->start);
            }

            if ($slot->end > $block->end) {
                $result[] = new TimeInterval($block->end, $slot->end);
            }
        }

        return $result;
    }
}
