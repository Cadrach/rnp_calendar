import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { axiosInstance } from "./axios-instance";
import { format } from "date-fns";

export interface AvailabilityInterval {
  start: string;
  end: string;
}

export interface RoomAvailability {
  room_id: number;
  start: string;
  end: string;
  intervals: AvailabilityInterval[];
}

const getRoomAvailability = (roomId: number, start: Date, end: Date) =>
  axiosInstance<RoomAvailability>({
    url: `/rooms/${roomId}/availability`,
    method: "GET",
    params: {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    },
  });

export const getRoomAvailabilityQueryKey = (roomId: number, start: Date, end: Date) =>
  ["rooms", roomId, "availability", format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")] as const;

export const useRoomAvailability = (
  roomId: number | null,
  start: Date | null,
  end: Date | null,
  options?: Omit<UseQueryOptions<RoomAvailability>, "queryKey" | "queryFn">
) =>
  useQuery({
    queryKey: getRoomAvailabilityQueryKey(roomId!, start!, end!),
    queryFn: () => getRoomAvailability(roomId!, start!, end!),
    enabled: roomId !== null && start !== null && end !== null,
    ...options,
  });
