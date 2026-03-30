import { useState, useMemo, useRef } from "react";
import { Box, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Calendar as BigCalendar, dateFnsLocalizer, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar-dark.scss";
import { useNavigate, useParams } from "react-router";
import type { Event } from "../api/generated/model";
import { CalendarEvent } from "./CalendarEvent";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarFilters, DEFAULT_FILTERS } from "../hooks/useCalendarFilters";
import { CreateEventModal } from "./CreateEventModal";
import { EventShowModal } from "./EventShowModal";
import { useDictionary } from "../contexts/DictionaryContext";
import { useCalendarNavigation } from "../hooks/useCalendarNavigation";
import { useCalendarAvailability } from "../hooks/useCalendarAvailability";
import { useCalendarEvents } from "../hooks/useCalendarEvents";

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

const formats = {
  dayHeaderFormat: (date: Date) => format(date, "EEEE d MMMM", { locale: fr }),
  agendaDateFormat: (date: Date) => format(date, "EEE d MMM", { locale: fr }),
  agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`,
};

export function Calendar() {
  const navigate = useNavigate();
  const { id: showEventId } = useParams<{ id?: string }>();

  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  // Use ref to avoid recreating toolbar component on filter changes
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const { games, user } = useDictionary();

  const {
    date,
    view,
    setView,
    visibleRange,
    availabilityRange,
    handleNavigate,
    handleRangeChange,
  } = useCalendarNavigation();

  const { backgroundEvents, dayPropGetter, handleSelecting } = useCalendarAvailability(
    filters.roomId,
    availabilityRange,
    visibleRange,
  );

  const { events, calendarEvents, eventStyleGetter } = useCalendarEvents(
    availabilityRange,
    filters,
  );

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (!user.is_mj) return;
    if (!handleSelecting({ start: slotInfo.start, end: slotInfo.end })) return;
    setSlot({ start: slotInfo.start, end: slotInfo.end });
    openCreate();
  };

  const handleSelectEvent = (event: Event & { start: Date; end: Date; title: string }) => {
    if (!event.id) return;
    navigate(`/show/${event.id}`);
  };

  const components = useMemo(
    () => ({
      event: CalendarEvent,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolbar: (props: any) => (
        <CalendarToolbar {...props} filtersRef={filtersRef} onFiltersChange={setFilters} />
      ),
    }),
    [],
  );

  return (
    <>
      <Box h="calc(100vh - var(--app-shell-header-height) - 10px)" p="md">
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          backgroundEvents={backgroundEvents as unknown as typeof calendarEvents}
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
          formats={formats}
          components={components}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
        />
      </Box>

      <Modal opened={createOpened} onClose={closeCreate} title="Nouvelle partie">
        {slot && (
          <CreateEventModal
            start={slot.start}
            end={slot.end}
            onClose={closeCreate}
            initialRoomId={filters.roomId}
          />
        )}
      </Modal>

      <Modal
        opened={!!showEventId}
        onClose={() => navigate("/")}
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
