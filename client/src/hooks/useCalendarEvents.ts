import { useMemo, useCallback } from "react";
import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import { useEventsIndex } from "../api/generated/event/event";
import { useDictionary } from "../contexts/DictionaryContext";
import type { CalendarFilters } from "./useCalendarFilters";

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
        .filter((e) => filters.gameId === null || e.game_id === filters.gameId)
        .filter((e) => filters.mjId === null || e.mj_discord_id === filters.mjId)
        .filter((e) => {
          if (!filters.myCalendar) return true;
          const isMj = e.mj_discord_id === user.discord_id;
          const isPlayer =
            user.discord_id != null && (e.player_ids as string[] | null)?.includes(user.discord_id);
          return isMj || isPlayer;
        })
        .filter((e) => {
          if (!filters.availableSlots) return true;
          // Past events have 0 available slots
          if (new Date(e.datetime_start) <= new Date()) {
            return filters.availableSlots[0] === 0;
          }
          const playerCount = (e.player_ids as string[] | null)?.length ?? 0;
          // No max = unlimited slots, treat as 4+
          const availableSlots =
            e.max_players == null ? 4 : Math.max(0, e.max_players - playerCount);
          const [min, max] = filters.availableSlots;
          // max=4 means "4+" so include anything >= 4
          if (max === 4) {
            return availableSlots >= min;
          }
          return availableSlots >= min && availableSlots <= max;
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
