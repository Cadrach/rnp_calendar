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
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar-dark.css";
import { useNavigate, useParams } from "react-router";
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";

extend([a11yPlugin]);
import { useEventsIndex } from "../api/generated/event/event";
import type { Event } from "../api/generated/model";
import { CalendarEvent } from "./CalendarEvent";
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
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const { games, rooms, members } = useDictionary();
  const { data: events } = useEventsIndex();

  const calendarEvents = useMemo(
    () =>
      (events ?? []).map((e) => {
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
    [events, games, rooms, members]
  );

  type CalendarEventType = (typeof calendarEvents)[number];

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

  const handleNavigate = (newDate: Date, _view: View, _action: NavigateAction) => {
    setDate(newDate);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
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
      <div style={{ height: "calc(100vh - 56px)", padding: "1rem" }}>
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          style={{ height: "100%" }}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={(v) => setView(v)}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          culture="fr"
          messages={messages}
          components={{
            event: CalendarEvent,
          }}
          eventPropGetter={eventStyleGetter}
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
