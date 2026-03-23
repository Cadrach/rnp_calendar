import type { MutableRefObject } from "react";
import { Flex, Group } from "@mantine/core";
import type { ToolbarProps, NavigateAction, View } from "react-big-calendar";
import { FilterDropdown, CalendarFilters } from "./CalendarFilter";
import { IconArrowBigLeftFilled, IconArrowBigRightFilled } from "@tabler/icons-react";

interface CalendarToolbarProps extends ToolbarProps {
  filtersRef: MutableRefObject<CalendarFilters>;
  onFiltersChange: (filters: CalendarFilters) => void;
}

export function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
  views,
  filtersRef,
  onFiltersChange,
}: CalendarToolbarProps) {
  const viewNames = Array.isArray(views) ? views : (Object.keys(views ?? {}) as View[]);

  return (
    <div className="rbc-toolbar">
      <Group gap="sm" wrap="wrap">
        <FilterDropdown filtersRef={filtersRef} onChange={onFiltersChange} />

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
        {viewNames.map((name) => (
          <button
            key={name}
            type="button"
            className={view === name ? "rbc-active" : ""}
            onClick={() => onView(name)}
          >
            {name === "month" && "Mois"}
            {name === "week" && "Semaine"}
            {name === "day" && "Jour"}
            {name === "agenda" && "Agenda"}
          </button>
        ))}
      </span>
    </div>
  );
}
