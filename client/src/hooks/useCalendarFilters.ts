import { useMemo } from "react";

export interface CalendarFilters {
  roomId: number | null;
  gameId: number | null;
  mjId: string | null;
  myCalendar: boolean;
  availableSlots: [number, number] | null;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  roomId: null,
  gameId: null,
  mjId: null,
  myCalendar: false,
  availableSlots: null,
};

export function useActiveFilterCount(filters: CalendarFilters): number {
  return useMemo(() => {
    let count = 0;
    if (filters.roomId !== null) count++;
    if (filters.gameId !== null) count++;
    if (filters.mjId !== null) count++;
    if (filters.myCalendar) count++;
    if (filters.availableSlots !== null) count++;
    return count;
  }, [filters]);
}
