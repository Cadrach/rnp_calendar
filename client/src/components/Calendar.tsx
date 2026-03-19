import { useState } from "react";
import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Calendar as BigCalendar, dateFnsLocalizer, View, NavigateAction, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEventsIndex } from "../api/generated/event/event";
import { CreateEventModal } from "./CreateEventModal";
import { useDictionary } from "../contexts/DictionaryContext";

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
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const { games } = useDictionary();
  const { data: events } = useEventsIndex();

  const calendarEvents = (events ?? []).map((e) => ({
    ...e,
    title: games.find((g) => g.id === e.game_id)?.name ?? String(e.game_id),
    start: new Date(e.datetime_start),
    end:   new Date(e.datetime_end),
  }));

  const handleNavigate = (newDate: Date, _view: View, action: NavigateAction) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSlot({ start: slotInfo.start, end: slotInfo.end });
    open();
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
          onView={handleViewChange}
          onSelectSlot={handleSelectSlot}
          selectable
          culture="fr"
          messages={messages}
        />
      </div>

      <Modal opened={opened} onClose={close} title="Nouvel événement">
        {slot && <CreateEventModal start={slot.start} end={slot.end} onClose={close} />}
      </Modal>
    </>
  );
}
