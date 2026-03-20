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
     */
    public function matches(RoomRule $rule, Carbon $date): bool
    {
        if ($rule->scope !== RoomRule::SCOPE_ONCE) {
            if ($rule->valid_from && $date->lt($rule->valid_from->copy()->startOfDay())) {
                return false;
            }

            if ($rule->valid_until && $date->gt($rule->valid_until->copy()->startOfDay())) {
                return false;
            }
        }

        return match ($rule->scope) {
            RoomRule::SCOPE_ONCE   => $rule->date !== null && $rule->date->isSameDay($date),
            RoomRule::SCOPE_DAILY  => true,
            RoomRule::SCOPE_WEEKLY => in_array($date->isoWeekday(), $rule->weekdays ?? [], strict: true),
            default                => false,
        };
    }
}
