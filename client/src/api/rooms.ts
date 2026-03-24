import { useQuery } from "@tanstack/react-query";
import type { Room } from "./generated/model";
import { axiosInstance } from "./axios-instance";

const getAvailableRooms = (start: Date, end: Date, eventId?: number | null) =>
  axiosInstance<Room[]>({
    url: `/rooms/available`,
    method: "GET",
    params: {
      start: start.toISOString(),
      end: end.toISOString(),
      ...(eventId != null ? { event_id: eventId } : {}),
    },
  });

export const getAvailableRoomsQueryKey = (start: Date, end: Date, eventId?: number | null) =>
  ["rooms", "available", start.toISOString(), end.toISOString(), eventId ?? null] as const;

export const useAvailableRooms = (start: Date, end: Date, eventId?: number | null) =>
  useQuery({
    queryKey: getAvailableRoomsQueryKey(start, end, eventId),
    queryFn: () => getAvailableRooms(start, end, eventId),
    staleTime: 30 * 1000,
  });

