import { useState, useMemo } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { View, NavigateAction } from "react-big-calendar";

export function useCalendarNavigation() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  // Exact grid shown in month view for the current date: first Monday on or before
  // the 1st to last Sunday on or after the last day. Week/day views reuse this same
  // range (and thus the same cache entry) as long as date stays in the same month.
  const availabilityRange = useMemo(() => ({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  }), [date]);

  const handleNavigate = (newDate: Date, _view: View, _action: NavigateAction) => {
    setDate(newDate);
  };

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    if (Array.isArray(range)) {
      setVisibleRange({ start: range[0], end: range[range.length - 1] });
    } else {
      setVisibleRange({ start: range.start, end: range.end });
    }
  };

  return { date, view, setView, visibleRange, availabilityRange, handleNavigate, handleRangeChange };
}
