import { useState, useMemo, useRef, useEffect } from "react";
import { Box, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Calendar as BigCalendar, dateFnsLocalizer, SlotInfo } from "react-big-calendar";
import type { View } from "react-big-calendar";
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
import type { CalendarView } from "../hooks/useCalendarNavigation";
import { useCalendarAvailability } from "../hooks/useCalendarAvailability";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { AvailabilityView } from "./AvailabilityView";

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

  const [slot, setSlot] = useState<{ start: Date; end: Date; roomId?: number } | null>(null);
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
    navigateAction,
    handleRangeChange,
  } = useCalendarNavigation();

  // The availability view is a scheduling tool: only MJ and admins get the button at all.
  const canSeeAvailability = user.is_mj || user.is_admin;

  const views = useMemo<CalendarView[]>(
    () => [
      "month",
      "week",
      "day",
      "agenda",
      ...(canSeeAvailability ? ["availability" as const] : []),
    ],
    [canSeeAvailability],
  );

  // Read through a ref so the toolbar component isn't recreated on every dictionary refresh.
  const viewsRef = useRef(views);
  viewsRef.current = views;

  // Losing the role mid-session must not leave the user stuck on a view they can't switch away from.
  useEffect(() => {
    if (!canSeeAvailability && view === "availability") setView("month");
  }, [canSeeAvailability, view, setView]);

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
        <CalendarToolbar
          label={props.label}
          view={props.view}
          views={viewsRef.current}
          onNavigate={props.onNavigate}
          onView={setView}
          filtersRef={filtersRef}
          onFiltersChange={setFilters}
        />
      ),
    }),
    [],
  );

  return (
    <>
      <Box h="calc(100vh - var(--app-shell-header-height) - 10px)" p="md">
        {view === "availability" ? (
          <div className="availability-layout">
            <CalendarToolbar
              label={`${format(availabilityRange.start, "d MMM", { locale: fr })} – ${format(
                availabilityRange.end,
                "d MMM yyyy",
                { locale: fr },
              )}`}
              view={view}
              views={views}
              onNavigate={navigateAction}
              onView={setView}
              showFilters={false}
            />
            <AvailabilityView
              weekStart={availabilityRange.start}
              weekEnd={availabilityRange.end}
              onSlotClick={(start, end, roomId) => {
                setSlot({ start, end, roomId });
                openCreate();
              }}
            />
          </div>
        ) : (
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            backgroundEvents={backgroundEvents as unknown as typeof calendarEvents}
            style={{ height: "100%" }}
            date={date}
            view={view as View}
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
        )}
      </Box>

      <Modal opened={createOpened} onClose={closeCreate} title="Nouvelle partie">
        {slot && (
          <CreateEventModal
            start={slot.start}
            end={slot.end}
            onClose={closeCreate}
            initialRoomId={slot.roomId ?? filters.roomId}
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
