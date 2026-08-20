import { useState, useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  addDays,
  addWeeks,
  subWeeks,
} from "date-fns";
import type { View, NavigateAction } from "react-big-calendar";

/** rbc's own views plus our custom, non-rbc "Disponibilités" table view. */
export type CalendarView = View | "availability";

export function useCalendarNavigation() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  // Range depends on view:
  // - month: first Monday on or before the 1st to last Sunday on or after the last day
  // - week/day: reuse month range for cache efficiency
  // - agenda: 30 days starting from current date (react-big-calendar default)
  // - availability: the current week only, since that view fetches per-room free slots
  const availabilityRange = useMemo(() => {
    if (view === "agenda") {
      return {
        start: startOfDay(date),
        end: addDays(startOfDay(date), 30),
      };
    }
    if (view === "availability") {
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
    };
  }, [date, view]);

  const handleNavigate = (newDate: Date, _view: View, _action: NavigateAction) => {
    setDate(newDate);
  };

  // Used by views we render ourselves: rbc isn't mounted, so nobody computes the new date for us.
  const navigateAction = (action: NavigateAction) => {
    if (action === "TODAY") setDate(new Date());
    else if (action === "PREV") setDate((d) => subWeeks(d, 1));
    else if (action === "NEXT") setDate((d) => addWeeks(d, 1));
  };

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    if (Array.isArray(range)) {
      setVisibleRange({ start: range[0], end: range[range.length - 1] });
    } else {
      setVisibleRange({ start: range.start, end: range.end });
    }
  };

  return {
    date,
    view,
    setView,
    visibleRange,
    availabilityRange,
    handleNavigate,
    navigateAction,
    handleRangeChange,
  };
}
