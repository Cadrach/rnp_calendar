import { useState, useMemo, useCallback } from "react";
import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  View,
  NavigateAction,
  SlotInfo,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar-dark.css";
import { useNavigate, useParams } from "react-router";
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";

extend([a11yPlugin]);
import { useEventsIndex } from "../api/generated/event/event";
import type { Event } from "../api/generated/model";
import { useRoomAvailability } from "../api/room-availability";
import { CalendarEvent } from "./CalendarEvent";
import { CalendarFilter, CalendarFilters, DEFAULT_FILTERS } from "./CalendarFilter";
import { CreateEventModal } from "./CreateEventModal";
import { EventShowModal } from "./EventShowModal";
import { useDictionary } from "../contexts/DictionaryContext";

function getContrastColor(bgColor: string): string {
  const bg = colord(bgColor);
  const contrastWithWhite = bg.contrast("#ffffff");
  const contrastWithDark = bg.contrast("#1a1b1e");
  return contrastWithDark > contrastWithWhite ? "#1a1b1e" : "#ffffff";
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { fr },
});

const messages = {
  today: "Aujourd'hui",
  previous: "Précédent",
  next: "Suivant",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  date: "Date",
  time: "Heure",
  event: "Événement",
  noEventsInRange: "Aucun événement dans cette période.",
  showMore: (count: number) => `+ ${count} de plus`,
};

export function Calendar() {
  const navigate = useNavigate();
  const { id: showEventId } = useParams<{ id?: string }>();

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const { games, rooms, members } = useDictionary();
  const { data: events } = useEventsIndex();

  const { data: availabilityData } = useRoomAvailability(
    filters.roomId,
    visibleRange.start,
    visibleRange.end,
    { staleTime: 5 * 60 * 1000 }
  );

  // Map available intervals to Date objects for reuse in both memos below
  const availableIntervals = useMemo(() => {
    if (!filters.roomId || !availabilityData) return [];
    return availabilityData.intervals.map((i) => ({
      start: new Date(i.start),
      end: new Date(i.end),
    }));
  }, [filters.roomId, availabilityData]);

  // Compute the complement of available intervals within the visible range.
  // These are fed to backgroundEvents so rbc greys out unavailable time in week/day views.
  const backgroundEvents = useMemo(() => {
    if (!filters.roomId || !availabilityData) return [];

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
  }, [filters.roomId, availabilityData, availableIntervals, visibleRange]);

  const calendarEvents = useMemo(
    () =>
      (events ?? [])
        .filter((e) => filters.roomId === null || e.room_id === filters.roomId)
        .map((e) => {
          const mj = members.find((m) => m.id === e.mj_discord_id);
          const room = rooms.find((r) => r.id === e.room_id);
          const roomColor = room?.color ?? "#3b82f6";
          const textColor = getContrastColor(roomColor);
          return {
            ...e,
            title: games.find((g) => g.id === e.game_id)?.name ?? String(e.game_id),
            start: new Date(e.datetime_start),
            end: new Date(e.datetime_end),
            gameName: games.find((g) => g.id === e.game_id)?.name ?? String(e.game_id),
            roomName: room?.name ?? null,
            roomColor,
            textColor,
            mj,
          };
        }),
    [events, games, rooms, members, filters]
  );

  type CalendarEventType = (typeof calendarEvents)[number];

  // In month view, darken day cells that have no availability at all.
  // backgroundEvents don't render in month view so dayPropGetter is the only hook available.
  const dayPropGetter = useCallback(
    (date: Date) => {
      if (!filters.roomId || !availabilityData) return {};

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const hasAvailability = availableIntervals.some(
        (interval) => interval.start < dayEnd && interval.end > dayStart
      );

      return hasAvailability ? {} : { className: "rbc-day-unavailable" };
    },
    [filters.roomId, availabilityData, availableIntervals]
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEventType) => ({
      style: {
        backgroundColor: event.roomColor ?? "#3b82f6",
        color: event.textColor,
        border: "none",
      },
    }),
    []
  );

  // Prevent selecting slots that overlap any unavailable interval.
  // Returning false cancels the drag selection and suppresses the visual feedback.
  const handleSelecting = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      if (!filters.roomId || availableIntervals.length === 0) return true;
      return availableIntervals.some(
        (interval) => interval.start <= start && interval.end >= end
      );
    },
    [filters.roomId, availableIntervals]
  );

  const handleNavigate = (newDate: Date, _view: View, _action: NavigateAction) => {
    setDate(newDate);
  };

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    // Month/agenda views give { start, end }; week/day views give an array of dates
    if (Array.isArray(range)) {
      setVisibleRange({ start: range[0], end: range[range.length - 1] });
    } else {
      setVisibleRange({ start: range.start, end: range.end });
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (!handleSelecting({ start: slotInfo.start, end: slotInfo.end })) return;
    setSlot({ start: slotInfo.start, end: slotInfo.end });
    openCreate();
  };

  const handleSelectEvent = (event: Event & { start: Date; end: Date; title: string }) => {
    navigate(`/show/${event.id}`);
  };

  const handleCloseShow = () => {
    navigate("/");
  };

  return (
    <>
      <CalendarFilter filters={filters} onChange={setFilters} />
      <div style={{ height: "calc(100vh - 56px - 52px)", padding: "1rem" }}>
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          backgroundEvents={backgroundEvents}
          style={{ height: "100%" }}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={(v) => setView(v)}
          onRangeChange={handleRangeChange}
          onSelecting={handleSelecting}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          culture="fr"
          messages={messages}
          components={{
            event: CalendarEvent,
          }}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
        />
      </div>

      <Modal opened={createOpened} onClose={closeCreate} title="Nouvel événement">
        {slot && <CreateEventModal start={slot.start} end={slot.end} onClose={closeCreate} />}
      </Modal>

      <Modal
        opened={!!showEventId}
        onClose={handleCloseShow}
        title={
          games.find((g) => g.id === events?.find((e) => String(e.id) === showEventId)?.game_id)
            ?.name ?? "Séance"
        }
      >
        {showEventId && <EventShowModal eventId={showEventId} />}
      </Modal>
    </>
  );
}
