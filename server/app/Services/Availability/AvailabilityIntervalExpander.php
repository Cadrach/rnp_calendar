<?php

namespace App\Services\Availability;

use App\Models\RoomRule;
use Carbon\Carbon;

class AvailabilityIntervalExpander
{
    public function __construct(private readonly AvailabilityRuleMatcher $matcher)
    {
    }

    /**
     * Expands a single rule into concrete datetime intervals within the given date range.
     *
     * Iterates each calendar day from $rangeStart to $rangeEnd (inclusive). For each day where
     * the rule matches (via AvailabilityRuleMatcher), a TimeInterval is created by combining
     * that day's date with the rule's start_time and end_time.
     *
     * Example: a weekly rule for Mondays 14:00–18:00 expanded over a two-week range
     * produces two TimeIntervals, one per matching Monday.
     *
     * @return TimeInterval[]
     */
    public function expand(RoomRule $rule, Carbon $rangeStart, Carbon $rangeEnd): array
    {
        $intervals = [];
        $day       = $rangeStart->copy()->startOfDay();
        $last      = $rangeEnd->copy()->startOfDay();

        while ($day->lte($last)) {
            if ($this->matcher->matches($rule, $day)) {
                // Interpret rule times in the club timezone so that e.g. "14:00"
                // means 14:00 local club time, not 14:00 UTC.
                $tz = config('app.club_timezone');
                $intervals[] = new TimeInterval(
                    Carbon::createFromFormat('Y-m-d H:i', $day->format('Y-m-d') . ' ' . substr($rule->start_time, 0, 5), $tz),
                    Carbon::createFromFormat('Y-m-d H:i', $day->format('Y-m-d') . ' ' . substr($rule->end_time, 0, 5), $tz),
                );
            }

            $day->addDay();
        }

        return $intervals;
    }
}
