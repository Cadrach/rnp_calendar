# ROOM_AVAILABILITY_TRACER.md

## Purpose

This project contains a room reservation system with rule-based room availability.

The availability of a room is **not** stored as generated calendar rows.
It is defined by explicit rules and computed dynamically.

Any AI assistant working on this codebase must preserve this design.

This tracer focuses only on:

1. Database structure
2. Backend rules logic and reservation/event verification
3. Frontend calendar greying-out based on computed rule output

It intentionally does **not** include admin panel or Filament concerns.

---

## Core business idea

Each room has a set of availability rules.

A rule can define that a room is:

- available every day during a time range
- available on specific weekdays during a time range
- available once on a specific date during a time range
- unavailable with the same kinds of scopes

The final availability is computed dynamically from the rules.

Reservations or events are only allowed inside the effective computed availability.

---

## Critical invariant

> Effective room availability is computed from explicit rules, and `unavailable` always overrides `available`.

This invariant must not be broken.

---

## High-level model

The system should work like this:

1. Store rooms
2. Store availability rules per room
3. For a requested date range, expand matching rules into concrete intervals
4. Build effective availability by subtracting unavailable intervals from available intervals
5. Use that effective availability:
   - on the backend to validate event creation
   - on the frontend to grey out non-bookable periods in the calendar

The frontend is never the source of truth.
The backend must always verify the booking independently.

---

## Database structure

### `rooms`

Suggested fields:

- `id`
- `name`
- `timezone` nullable
- `created_at`
- `updated_at`

Notes:
- `timezone` is optional, but recommended if rooms may operate in different timezones
- if not used, the whole system must consistently use the application timezone

### `room_rules`

Suggested fields:

- `id`
- `room_id`
- `kind` enum: `available | unavailable`
- `scope` enum: `daily | weekly | once`
- `date` nullable
- `weekdays` JSON nullable
- `start_time`
- `end_time`
- `valid_from` nullable
- `valid_until` nullable
- `priority` integer default 0
- `reason` nullable
- `created_at`
- `updated_at`

---

## Field semantics

### `kind`

Defines whether the rule adds or removes availability.

Allowed values:

- `available`
- `unavailable`

### `scope`

Defines how the rule applies.

Allowed values:

- `daily`
- `weekly`
- `once`

### `date`

Used only when `scope = once`.

Example:
- `2026-04-21`

### `weekdays`

Used only when `scope = weekly`.

Suggested JSON format:

```json
[1, 3, 5]
```

Weekday mapping:

- `1 = Monday`
- `2 = Tuesday`
- `3 = Wednesday`
- `4 = Thursday`
- `5 = Friday`
- `6 = Saturday`
- `7 = Sunday`

### `start_time` and `end_time`

Define the local time interval covered by the rule.

Constraints:

- `end_time` must be strictly greater than `start_time`
- this first version of the system does **not** support overnight ranges crossing midnight

So this is invalid:

- `22:00 -> 02:00`

If overnight logic is needed later, it must be added as an explicit design change.

### `valid_from` and `valid_until`

Optional date bounds for repeating rules.

Meaning:

- the rule only applies between these dates
- outside that date range, the rule is ignored

Constraint:

- if both are set, `valid_from <= valid_until`

### `priority`

Optional future-use field.
It should not be part of the core rule resolution unless explicitly introduced later.

### `reason`

Optional human-readable explanation.

Examples:

- maintenance
- holiday closure
- special opening
- staff shortage

---

## Why this schema

This schema is intentionally simple and explicit.

It supports:

- recurring availability every day
- recurring availability on selected weekdays
- one-off availability
- one-off closure
- recurring closure
- temporary active periods for repeating rules

It avoids:

- opaque recurrence strings as the primary storage model
- pre-generated calendar rows
- multiple rule tables
- overcomplicated recurrence engines

---

## Example rule representations

### Example A: available every day from 09:00 to 10:00

```json
{
  "kind": "available",
  "scope": "daily",
  "start_time": "09:00:00",
  "end_time": "10:00:00"
}
```

### Example B: available every Monday from 10:00 to 13:00

```json
{
  "kind": "available",
  "scope": "weekly",
  "weekdays": [1],
  "start_time": "10:00:00",
  "end_time": "13:00:00"
}
```

### Example C: available once on 2026-04-18 from 17:00 to 22:00

```json
{
  "kind": "available",
  "scope": "once",
  "date": "2026-04-18",
  "start_time": "17:00:00",
  "end_time": "22:00:00"
}
```

### Example D: unavailable once on 2026-04-21 from 17:00 to 22:00

```json
{
  "kind": "unavailable",
  "scope": "once",
  "date": "2026-04-21",
  "start_time": "17:00:00",
  "end_time": "22:00:00"
}
```

### Example E: available every Monday from 10:00 to 13:00 only during spring 2026

```json
{
  "kind": "available",
  "scope": "weekly",
  "weekdays": [1],
  "start_time": "10:00:00",
  "end_time": "13:00:00",
  "valid_from": "2026-03-01",
  "valid_until": "2026-05-31"
}
```

---

## Rule matching logic

A rule matches a target date as follows.

### `scope = once`

The rule matches only if:

- `rule.date == target_date`

### `scope = daily`

The rule matches if:

- the target date is within the rule validity window
- or there is no validity window

### `scope = weekly`

The rule matches if:

- the target weekday is included in `rule.weekdays`
- and the target date is within the rule validity window
- or there is no validity window

---

## Effective availability resolution

Given a room and a requested date range:

### Step 1: load candidate rules

Load all rules for the room that could affect the requested range.

This means:

- all `once` rules whose `date` falls inside the requested range
- all repeating rules that overlap the requested date range via `valid_from` / `valid_until`
- all repeating rules without validity bounds

### Step 2: expand rules into concrete intervals

Expand each matching rule into actual datetime intervals inside the requested range.

Examples:

- a `daily` rule becomes one interval per day in range
- a `weekly` rule becomes one interval for each matching weekday in range
- a `once` rule becomes one interval on its date only

### Step 3: split intervals by kind

Create two groups:

- available intervals
- unavailable intervals

### Step 4: normalize available intervals

Merge overlapping or directly adjacent available intervals when appropriate.

Preferred behavior:

- `09:00-10:00` and `10:00-11:00` may merge into `09:00-11:00`

### Step 5: subtract unavailable intervals

Subtract every unavailable interval from the available intervals.

### Step 6: result

The remaining intervals are the effective bookable availability.

---

## Conflict resolution

The conflict policy is intentionally simple:

- `available` creates candidate bookable periods
- `unavailable` removes time from them
- `unavailable` always wins

Examples:

### Example 1

Available:
- 09:00-12:00

Unavailable:
- 10:00-11:00

Result:
- 09:00-10:00
- 11:00-12:00

### Example 2

Available:
- 09:00-12:00

Unavailable:
- 09:00-12:00

Result:
- no availability

### Example 3

No matching available rule

Result:
- not bookable

---

## Backend booking and event verification

The backend must validate every event or reservation creation request.

This validation must not depend on frontend display state.

### Rule for event creation

An event can be created only if:

1. the requested start and end are valid
2. the requested time range is fully contained inside effective availability
3. the requested time range does not overlap an existing reservation/event for that room
4. all business-specific constraints are satisfied

If any part of the requested event falls outside effective availability, creation must be rejected.

### Important principle

Do not validate by checking raw rules one by one during creation in an ad hoc way.

Instead:

1. compute effective availability for the relevant date or date range
2. verify that the requested interval is fully contained within one of the effective intervals
3. verify no event overlap

This keeps validation consistent with frontend display.

---

## Suggested backend validation flow for event creation

When a user wants to create an event:

### Input

- `room_id`
- `start_datetime`
- `end_datetime`

### Validation steps

#### 1. Basic validation

Reject if:

- room does not exist
- end <= start
- datetime format is invalid

#### 2. Determine relevant date span

Build the minimal date range needed to evaluate the request.

For a same-day booking:
- only that day

For a multi-day request:
- all dates touched by the event

Even if multi-day events are not currently allowed, the validator should be explicit about rejecting them or supporting them.

#### 3. Compute effective availability

Resolve availability for the room across the relevant date span.

#### 4. Containment check

Confirm the requested interval is fully contained within an effective available interval.

Not just overlapping.
Fully contained.

Example:

Available:
- 09:00-12:00

Requested:
- 11:30-12:30

Result:
- reject

because part of the request is outside availability.

#### 5. Existing event overlap check

Reject if the requested event overlaps another existing event for the same room.

Standard overlap test:

- `requested_start < existing_end`
- `requested_end > existing_start`

When updating an existing event, exclude the event itself from the overlap check.

Soft-deleted events are automatically excluded (Eloquent global scope).

#### 6. Return clear error reason

Prefer explicit failures such as:

- room is not available during the requested period
- requested time partially falls outside allowed availability
- room is already booked during the requested period

---

## Backend service design

Suggested model names:

- `Room`
- `RoomRule`
- `Reservation` or `RoomEvent`

Suggested service classes:

- `AvailabilityRuleMatcher`
- `AvailabilityIntervalExpander`
- `AvailabilityResolver`
- `EventCreationValidator`

Alternative:

- `RoomAvailabilityService`
- `RoomBookingService`

But the internals should still separate responsibilities.

### Suggested responsibilities

#### `AvailabilityRuleMatcher`

Determines whether a rule applies to a target date.

#### `AvailabilityIntervalExpander`

Turns rules into concrete intervals for a requested date range.

#### `AvailabilityResolver`

Builds effective availability by:

- expanding matching rules
- merging available intervals
- subtracting unavailable intervals

#### `EventCreationValidator`

Checks whether a requested event can be created.

It should verify:

- input validity
- containment in effective availability
- no overlap with existing events

---

## Frontend calendar behavior

The calendar UI should visually communicate bookable vs non-bookable time.

The frontend should **not** re-implement the full rule engine independently if it can be avoided.

Preferred approach:

- backend computes calendar availability output for the visible range
- frontend uses that output to grey out or highlight ranges in the calendar

This keeps backend and frontend consistent.

---

## Frontend data contract

For a visible calendar range, the frontend should request computed availability from the backend.

Suggested response concept:

- list of effective available intervals
- optionally list of unavailable intervals or greyed-out intervals
- existing bookings returned separately

Endpoint: **`GET /api/rooms/{room}/availability?start=YYYY-MM-DD&end=YYYY-MM-DD`**

Response shape (implemented):

```json
{
  "room_id": 12,
  "start": "2026-04-01",
  "end": "2026-04-07",
  "intervals": [
    { "start": "2026-04-01T14:00:00", "end": "2026-04-01T23:00:00" },
    { "start": "2026-04-03T14:00:00", "end": "2026-04-03T23:00:00" }
  ]
}
```

`intervals` contains only the effective bookable slots — everything else is implicitly non-bookable.

For unlimited rooms, a single interval spanning the full requested range is returned.

The `start`/`end` keys on each interval match the shape of react-big-calendar events, so the
frontend can pass `intervals` directly to the `backgroundEvents` prop after mapping each entry
through `new Date()`:

```ts
backgroundEvents={intervals.map(i => ({ ...i, start: new Date(i.start), end: new Date(i.end) }))}
```

---

## Greying out the calendar on the frontend

Goal:

- visually mark periods where booking is not allowed

Recommended UI model:

- normal events = existing reservations
- background intervals = availability visualization or non-bookable overlays

### Recommended strategy

For the visible calendar window:

1. fetch computed effective availability from backend
2. render bookings as regular events
3. render availability or non-availability as background ranges
4. disable or reject selection attempts outside effective availability

### Important principle

Frontend greying-out is a usability feature.
Backend validation remains authoritative.

---

## Two frontend display options

### Option A: show available windows

Render effective available intervals as background ranges.
Everything else appears implicitly unavailable.

Good when:
- bookable periods are sparse
- you want to emphasize when the room can be booked

### Option B: show greyed-out unavailable windows

Compute non-bookable portions of the visible range and render them as grey overlays.

Good when:
- you want a stronger “disabled” visual state
- the calendar should clearly show blocked areas

Either option is acceptable, but the data should come from backend rule resolution.

---

## Calendar interaction rules

When the user selects or drags on the calendar:

### Allowed UX behavior

- allow selection only inside effective availability if the component supports it
- or allow tentative selection but reject immediately if outside allowed time

### Required backend behavior

Even if the UI already prevents invalid selection, event creation must still be validated by backend rules.

Never trust frontend-only blocking.

---

## Date and time handling rules

Use immutable date objects where possible.

Keep these principles explicit:

- do not mix date-only and datetime logic carelessly
- always compare intervals in a consistent timezone
- use the room timezone if enabled
- otherwise use the application timezone consistently
- avoid hidden timezone conversions between frontend and backend

For API responses, prefer full datetime strings in ISO-style format.

---

## Edge cases that must be handled

### 1. No matching available rule

Result:
- the room is not bookable

### 2. Matching available and unavailable rules at the same time

Result:
- unavailable removes the overlapping portion

### 3. Partial overlap

Available:
- 09:00-12:00

Unavailable:
- 10:00-11:00

Result:
- 09:00-10:00
- 11:00-12:00

### 4. One-off opening outside recurring schedule

If a `once available` rule creates availability for a date, that period is bookable.

### 5. One-off closure during recurring opening

If a `once unavailable` rule overlaps a recurring opening, that portion is removed.

### 6. Repeating rule outside validity window

It does not apply.

### 7. Adjacent intervals

Preferred behavior:
- contiguous available intervals may be merged

### 8. Invalid rule data

Must be rejected at validation or persistence level.
Do not silently correct it.

### 9. Event partially outside available time

Must be rejected.

### 10. Event exactly matching an availability edge

Allowed if fully contained.

Example:

Available:
- 09:00-10:00

Request:
- 09:00-10:00

Result:
- allowed

---

## Testing requirements

Any AI-generated code touching this system should add or preserve tests for these areas.

### Database and model validation

- valid `kind`
- valid `scope`
- `date` required for `once`
- `weekdays` required for `weekly`
- invalid time range rejected
- invalid validity window rejected

### Rule matching

- daily rules
- weekly rules
- once rules
- validity window behavior

### Interval expansion

- one day expansion
- multi-day expansion
- weekly repetition
- once-only interval generation

### Availability resolution

- available only
- unavailable only
- exact subtraction
- partial subtraction
- full cancellation
- split intervals after subtraction
- adjacent interval merging

### Event creation validation

- fully contained booking accepted
- partial containment rejected
- outside availability rejected
- overlap with existing booking rejected
- exact edge booking accepted

### Frontend contract tests

- API returns intervals in expected shape
- visible range output is stable and predictable
- greyed-out or available background ranges match backend resolution

---

## Explicit non-goals for now

Do not introduce these unless explicitly requested:

- RRULE strings as the primary DB storage model
- per-minute generated rows stored permanently
- overnight rules crossing midnight
- independent frontend rule engine as source of truth
- complex priority-based conflict resolution
- multiple rule tables unless a later refactor is clearly justified

---

## Guidance for AI assistants modifying this code

When generating code for this project:

1. Preserve the rule-based architecture
2. Keep the database fields explicit and readable
3. Keep rule resolution on the backend
4. Use backend-computed intervals for frontend calendar display
5. Validate event creation against effective availability, not raw assumptions
6. Treat unavailable as overriding available
7. Prefer clarity over abstraction
8. Add tests when changing behavior
9. Do not move core validation into React
10. Do not replace the explicit DB model with opaque recurrence strings

---

## Suggested implementation order

1. ~~create migration for `room_rules`~~ **DONE**
2. ~~create enums or constants for `kind` and `scope`~~ **DONE** (constants in RoomRule model)
3. ~~create RoomRule model~~ **DONE**
4. build model validation rules
5. ~~implement rule matcher~~ **DONE** (`App\Services\Availability\AvailabilityRuleMatcher`)
6. ~~implement interval expansion~~ **DONE** (`App\Services\Availability\AvailabilityIntervalExpander`)
7. ~~implement availability resolution~~ **DONE** (`App\Services\Availability\AvailabilityResolver`)
8. ~~implement event creation validator~~ **DONE** (`App\Services\Availability\EventBookingValidator`, wired into `EventController::store()` and `update()`)
9. ~~expose availability endpoint for visible calendar ranges~~ **DONE** (`GET /api/rooms/{room}/availability`)
10. ~~wire frontend calendar grey-out/background behavior to backend output~~ **DONE** (`useRoomAvailability` hook + `backgroundEvents` prop in `Calendar`)
11. add integration tests for booking validation and calendar availability output

---

## Final reminder

This system is successful only if these three things remain aligned:

1. the database stores explicit availability rules
2. the backend resolves those rules and validates event creation
3. the frontend calendar displays the resolved availability state clearly

The frontend display is informative.
The backend validation is authoritative.
