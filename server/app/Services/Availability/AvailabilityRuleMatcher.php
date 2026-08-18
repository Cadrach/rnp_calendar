<?php

namespace App\Services\Availability;

use App\Models\RoomRule;
use Carbon\Carbon;

class AvailabilityRuleMatcher
{
    /**
     * Returns true if the given rule applies to the given calendar date.
     *
     * For repeating rules (daily, weekly), the validity window (valid_from / valid_until) is
     * checked first — if the date falls outside it, the rule does not apply.
     *
     * Scope-specific logic:
     *   - once:   matches only on the exact rule date
     *   - daily:  matches every day (within the validity window)
     *   - weekly: matches only if the date's ISO weekday is listed in rule->weekdays
     *
     * Dates are compared as Y-m-d calendar days rather than as instants: $date is built in the
     * club timezone while date / valid_from / valid_until are `date` casts sitting at UTC midnight,
     * so an instant comparison would put a club-midnight date on the wrong side of the boundary.
     */
    public function matches(RoomRule $rule, Carbon $date): bool
    {
        $day = $date->format('Y-m-d');

        if ($rule->scope !== RoomRule::SCOPE_ONCE) {
            if ($rule->valid_from && $day < $rule->valid_from->format('Y-m-d')) {
                return false;
            }

            if ($rule->valid_until && $day > $rule->valid_until->format('Y-m-d')) {
                return false;
            }
        }

        return match ($rule->scope) {
            RoomRule::SCOPE_ONCE   => $rule->date !== null && $rule->date->format('Y-m-d') === $day,
            RoomRule::SCOPE_DAILY  => true,
            RoomRule::SCOPE_WEEKLY => in_array($date->isoWeekday(), $rule->weekdays ?? [], strict: true),
            default                => false,
        };
    }
}
