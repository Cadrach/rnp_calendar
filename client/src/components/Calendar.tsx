import { useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View, NavigateAction } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";

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

  const handleNavigate = (newDate: Date, _view: View, action: NavigateAction) => {
    console.log("navigate", action, newDate);
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    console.log("view change", newView);
    setView(newView);
  };

  return (
    <div style={{ height: "100vh", padding: "1rem" }}>
      <BigCalendar
        localizer={localizer}
        events={[]}
        style={{ height: "100%" }}
        date={date}
        view={view}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        culture="fr"
        messages={messages}
      />
    </div>
  );
}
