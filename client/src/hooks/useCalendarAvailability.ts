import { useMemo, useCallback } from "react";
import { startOfDay, endOfDay } from "date-fns";
import { useRoomAvailability } from "../api/room-availability";

export function useCalendarAvailability(
  roomId: number | null,
  availabilityRange: { start: Date; end: Date },
  visibleRange: { start: Date; end: Date },
) {
  const { data: availabilityData } = useRoomAvailability(
    roomId,
    availabilityRange.start,
    availabilityRange.end,
    { staleTime: 5 * 60 * 1000 },
  );

  const availableIntervals = useMemo(() => {
    if (!roomId || !availabilityData) return [];
    return availabilityData.intervals.map((i) => ({
      start: new Date(i.start),
      end: new Date(i.end),
    }));
  }, [roomId, availabilityData]);

  // Complement of available intervals within the visible range, fed to rbc backgroundEvents
  // so unavailable time is greyed out in week/day views.
  const backgroundEvents = useMemo(() => {
    if (!roomId || !availabilityData) return [];

    const sorted = [...availableIntervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const rangeStart = startOfDay(visibleRange.start);
    const rangeEnd = endOfDay(visibleRange.end);

    const result: { start: Date; end: Date; title: string }[] = [];
    let cursor = rangeStart;

    for (const interval of sorted) {
      if (interval.start > cursor) {
        result.push({ start: cursor, end: interval.start, title: "" });
      }
      if (interval.end > cursor) {
        cursor = interval.end;
      }
    }

    if (cursor < rangeEnd) {
      result.push({ start: cursor, end: rangeEnd, title: "" });
    }

    return result;
  }, [roomId, availabilityData, availableIntervals, visibleRange]);

  // Darken day cells with no availability in month view (backgroundEvents don't render there).
  const dayPropGetter = useCallback(
    (date: Date) => {
      if (!roomId || !availabilityData) return {};
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const hasAvailability = availableIntervals.some(
        (i) => i.start < dayEnd && i.end > dayStart,
      );
      return hasAvailability ? {} : { className: "rbc-day-unavailable" };
    },
    [roomId, availabilityData, availableIntervals],
  );

  // Prevent selecting slots that fall outside available intervals.
  const handleSelecting = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      if (!roomId || availableIntervals.length === 0) return true;
      return availableIntervals.some((i) => i.start <= start && i.end >= end);
    },
    [roomId, availableIntervals],
  );

  return { backgroundEvents, dayPropGetter, handleSelecting };
}
