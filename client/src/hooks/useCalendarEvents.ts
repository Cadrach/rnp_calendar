import { useMemo, useCallback } from "react";
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import { useEventsIndex } from "../api/generated/event/event";
import { useDictionary } from "../contexts/DictionaryContext";
import type { CalendarFilters } from "../components/CalendarFilter";

extend([a11yPlugin]);

function getContrastColor(bgColor: string): string {
  const bg = colord(bgColor);
  const contrastWithWhite = bg.contrast("#ffffff");
  const contrastWithDark = bg.contrast("#1a1b1e");
  return contrastWithDark > contrastWithWhite ? "#1a1b1e" : "#ffffff";
}

export function useCalendarEvents(
  availabilityRange: { start: Date; end: Date },
  filters: CalendarFilters,
) {
  const { games, rooms, members } = useDictionary();

  const { data: events } = useEventsIndex(
    {
      start: availabilityRange.start.toISOString(),
      end: availabilityRange.end.toISOString(),
    },
    { query: { staleTime: 5 * 60 * 1000 } },
  );

  const calendarEvents = useMemo(
    () =>
      (events ?? [])
        .filter((e) => filters.roomId === null || e.room_id === filters.roomId)
        .map((e) => {
          const mj = members.find((m) => m.id === e.mj_discord_id);
          const room = rooms.find((r) => r.id === e.room_id);
          const roomColor = room?.color ?? "#3b82f6";
          return {
            ...e,
            title: games.find((g) => g.id === e.game_id)?.name ?? String(e.game_id),
            start: new Date(e.datetime_start),
            end: new Date(e.datetime_end),
            gameName: games.find((g) => g.id === e.game_id)?.name ?? String(e.game_id),
            roomName: room?.name ?? null,
            roomColor,
            textColor: getContrastColor(roomColor),
            mj,
          };
        }),
    [events, games, rooms, members, filters],
  );

  type CalendarEventType = (typeof calendarEvents)[number];

  const eventStyleGetter = useCallback(
    (event: CalendarEventType) => ({
      style: {
        backgroundColor: event.roomColor,
        color: event.textColor,
        border: "none",
      },
    }),
    [],
  );

  return { events, calendarEvents, eventStyleGetter };
}
