<?php

namespace Tests\Unit;

use App\Models\RoomRule;
use App\Services\Availability\AvailabilityRuleMatcher;
use Carbon\Carbon;
use Tests\TestCase;

class AvailabilityRuleMatcherTest extends TestCase
{
    private const TZ = 'Europe/Paris';

    private AvailabilityRuleMatcher $matcher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->matcher = new AvailabilityRuleMatcher();
    }

    public function test_a_daily_rule_matches_on_its_first_valid_day(): void
    {
        // valid_from is a `date` cast sitting at UTC midnight, while the day passed in is club
        // midnight (22:00 UTC the day before) — comparing them as instants excluded this day.
        $rule = $this->rule(['valid_from' => '2026-08-22']);

        $this->assertTrue($this->matcher->matches($rule, $this->clubDay('2026-08-22')));
        $this->assertFalse($this->matcher->matches($rule, $this->clubDay('2026-08-21')));
    }

    public function test_a_daily_rule_matches_on_its_last_valid_day(): void
    {
        $rule = $this->rule(['valid_until' => '2026-08-22']);

        $this->assertTrue($this->matcher->matches($rule, $this->clubDay('2026-08-22')));
        $this->assertFalse($this->matcher->matches($rule, $this->clubDay('2026-08-23')));
    }

    public function test_a_once_rule_matches_only_its_own_day(): void
    {
        $rule = $this->rule(['scope' => RoomRule::SCOPE_ONCE, 'date' => '2026-08-22']);

        $this->assertTrue($this->matcher->matches($rule, $this->clubDay('2026-08-22')));
        $this->assertFalse($this->matcher->matches($rule, $this->clubDay('2026-08-23')));
    }

    public function test_a_weekly_rule_uses_the_club_weekday(): void
    {
        // 2026-08-22 is a Saturday (ISO 6) in club time.
        $rule = $this->rule(['scope' => RoomRule::SCOPE_WEEKLY, 'weekdays' => [6]]);

        $this->assertSame(6, $this->clubDay('2026-08-22')->isoWeekday());
        $this->assertTrue($this->matcher->matches($rule, $this->clubDay('2026-08-22')));
        $this->assertFalse($this->matcher->matches($rule, $this->clubDay('2026-08-23')));
    }

    private function rule(array $attributes = []): RoomRule
    {
        return new RoomRule(array_merge([
            'kind'       => RoomRule::KIND_AVAILABLE,
            'scope'      => RoomRule::SCOPE_DAILY,
            'start_time' => '14:00:00',
            'end_time'   => '23:00:00',
        ], $attributes));
    }

    /** Midnight in the club timezone, as the interval expander produces it. */
    private function clubDay(string $date): Carbon
    {
        return Carbon::parse($date, self::TZ)->startOfDay();
    }
}
