import type { ReactNode, RefObject } from "react";
import { Flex, Group } from "@mantine/core";
import type { NavigateAction } from "react-big-calendar";
import { FilterDropdown } from "./CalendarFilter";
import type { CalendarFilters } from "../hooks/useCalendarFilters";
import type { CalendarView } from "../hooks/useCalendarNavigation";
import { IconArrowBigLeftFilled, IconArrowBigRightFilled } from "@tabler/icons-react";

const VIEW_LABELS: Record<string, string> = {
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  availability: "Dispos",
};

interface CalendarToolbarProps {
  label: ReactNode;
  view: CalendarView;
  views: CalendarView[];
  onNavigate: (action: NavigateAction) => void;
  onView: (view: CalendarView) => void;
  /** Filters are calendar-only; the availability view opts out. */
  showFilters?: boolean;
  filtersRef?: RefObject<CalendarFilters>;
  onFiltersChange?: (filters: CalendarFilters) => void;
}

export function CalendarToolbar({
  label,
  view,
  views,
  onNavigate,
  onView,
  showFilters = true,
  filtersRef,
  onFiltersChange,
}: CalendarToolbarProps) {
  return (
    <div className="rbc-toolbar">
      <Group gap="sm" wrap="wrap">
        {showFilters && filtersRef && onFiltersChange && (
          <FilterDropdown filtersRef={filtersRef} onChange={onFiltersChange} />
        )}

        <span className="rbc-btn-group">
          <button type="button" onClick={() => onNavigate("TODAY" as NavigateAction)}>
            Aujourd'hui
          </button>
          <button type="button" onClick={() => onNavigate("PREV" as NavigateAction)}>
            <Flex align="center">
              <IconArrowBigLeftFilled size={21} />
            </Flex>
          </button>
          <button type="button" onClick={() => onNavigate("NEXT" as NavigateAction)}>
            <Flex align="center">
              <IconArrowBigRightFilled size={21} />
            </Flex>
          </button>
        </span>
      </Group>

      <span className="rbc-toolbar-label">{label}</span>

      <span className="rbc-btn-group">
        {views.map((name) => (
          <button
            key={name}
            type="button"
            className={view === name ? "rbc-active" : ""}
            onClick={() => onView(name)}
          >
            {VIEW_LABELS[name] ?? name}
          </button>
        ))}
      </span>
    </div>
  );
}
