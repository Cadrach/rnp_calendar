import { useState } from "react";
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
import { CalendarFilter, CalendarFilters, DEFAULT_FILTERS } from "./CalendarFilter";
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

export function Calendar() {
  const navigate = useNavigate();
  const { id: showEventId } = useParams<{ id?: string }>();

  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

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

  return (
    <>
      <CalendarFilter filters={filters} onChange={setFilters} />
      <Box
        h={{
          base: "calc(100vh - var(--app-shell-header-height) - 120px)",
          sm: "calc(100vh - var(--app-shell-header-height) - 72px)",
        }}
        p="md"
      >
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
          components={{ event: CalendarEvent }}
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
