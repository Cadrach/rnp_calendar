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
  const { games, rooms, members, user } = useDictionary();

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
        .filter((e) => {
          if (!filters.myCalendar) return true;
          const isMj = e.mj_discord_id === user.discord_id;
          const isPlayer = user.discord_id != null &&
            (e.player_ids as string[] | null)?.includes(user.discord_id);
          return isMj || isPlayer;
        })
        .filter((e) => {
          if (!filters.openGames) return true;
          if (new Date(e.datetime_start) <= new Date()) return false;
          if (e.max_players == null) return true;
          return ((e.player_ids as string[] | null)?.length ?? 0) < e.max_players;
        })
        .map((e) => {
          const mj = members.find((m) => m.id === e.mj_discord_id);
          const room = rooms.find((r) => r.id === e.room_id);
          const roomColor = room?.color ?? "#3b82f6";
          const playerCount = (e.player_ids as string[] | null)?.length ?? 0;
          const isFull = e.max_players != null && playerCount >= e.max_players;
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
            isFull,
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
