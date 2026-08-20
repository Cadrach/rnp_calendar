<?php

namespace App\Services\Availability;

use App\Models\Event;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Free (unbooked) time slots for a room over a date range: its effective availability rules, minus
 * the events already booked in it.
 *
 * Shared by the per-room endpoint and the all-rooms one — which is why the event lookup is batchable
 * and why the club-timezone handling lives here rather than in a controller.
 */
class FreeSlotResolver
{
    public function __construct(private readonly AvailabilityResolver $resolver)
    {
    }

    /**
     * Parses the `date` / `end_date` params into an inclusive range of whole club-timezone days.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function range(string $date, ?string $endDate = null): array
    {
        $tz = config('app.club_timezone');

        return [
            Carbon::parse($date, $tz)->startOfDay(),
            Carbon::parse($endDate ?? $date, $tz)->endOfDay(),
        ];
    }

    /**
     * @return TimeInterval[]
     */
    public function forRoom(Room $room, Carbon $rangeStart, Carbon $rangeEnd, ?int $excludeEventId = null): array
    {
        // Unlimited rooms never need the events, so don't pay for the query.
        $events = $room->unlimited
            ? new Collection()
            : $this->bookedEvents([$room->id], $rangeStart, $rangeEnd, $excludeEventId);

        return $this->compute($room, $rangeStart, $rangeEnd, $events);
    }

    /**
     * forRoom() for many rooms at once, with a single events query for the whole set.
     *
     * @param  Collection<int, Room>  $rooms
     * @return array<int, TimeInterval[]>  slots keyed by room id
     */
    public function forRooms(Collection $rooms, Carbon $rangeStart, Carbon $rangeEnd, ?int $excludeEventId = null): array
    {
        $byRoom = $this
            ->bookedEvents($rooms->pluck('id')->all(), $rangeStart, $rangeEnd, $excludeEventId)
            ->groupBy('room_id');

        $slots = [];

        foreach ($rooms as $room) {
            $slots[$room->id] = $this->compute(
                $room,
                $rangeStart,
                $rangeEnd,
                $byRoom->get($room->id, new Collection()),
            );
        }

        return $slots;
    }

    /**
     * Serializes slots in the club timezone, so a slot never reports two different offsets for
     * boundaries that came from different sources.
     *
     * @param  TimeInterval[]  $slots
     * @return array<int, array{start: string, end: string}>
     */
    public function toArray(array $slots): array
    {
        $tz = config('app.club_timezone');

        return array_values(array_map(fn (TimeInterval $slot) => [
            'start' => $slot->start->copy()->setTimezone($tz)->toIso8601String(),
            'end'   => $slot->end->copy()->setTimezone($tz)->toIso8601String(),
        ], $slots));
    }

    /**
     * @param  Collection<int, Event>  $events
     * @return TimeInterval[]
     */
    private function compute(Room $room, Carbon $rangeStart, Carbon $rangeEnd, Collection $events): array
    {
        // Unlimited rooms bypass every booking check (see Room::$unlimited and
        // EventBookingValidator::validate), so the whole range is free and nothing is subtracted.
        if ($room->unlimited) {
            return [new TimeInterval($rangeStart->copy(), $rangeEnd->copy())];
        }

        $tz    = config('app.club_timezone');
        $slots = $this->resolver->resolve($room, $rangeStart->copy(), $rangeEnd->copy()->startOfDay());

        foreach ($events as $event) {
            $slots = $this->resolver->subtractInterval($slots, new TimeInterval(
                $event->datetime_start->copy()->setTimezone($tz),
                $event->datetime_end->copy()->setTimezone($tz),
            ));
        }

        return $slots;
    }

    /**
     * @param  int[]  $roomIds
     * @return Collection<int, Event>
     */
    private function bookedEvents(array $roomIds, Carbon $rangeStart, Carbon $rangeEnd, ?int $excludeEventId): Collection
    {
        if ($roomIds === []) {
            return new Collection();
        }

        // datetime_start / datetime_end are stored in UTC, and Connection::prepareBindings()
        // formats Carbon bindings without converting them — so hand it UTC instants explicitly,
        // otherwise club-timezone wall clock would be compared against UTC values.
        return Event::whereIn('room_id', $roomIds)
            ->when($excludeEventId !== null, fn ($q) => $q->where('id', '!=', $excludeEventId))
            ->where('datetime_start', '<', $rangeEnd->copy()->utc())
            ->where('datetime_end', '>', $rangeStart->copy()->utc())
            ->get();
    }
}
