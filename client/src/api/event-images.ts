import { useMutation } from "@tanstack/react-query";
import type {
  MutationFunction,
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import { axiosInstance } from "./axios-instance";
import type { ErrorType } from "./axios-instance";
import type { Event, EventImage } from "./generated/model";

export type { EventImage };

/** `images` is optional on the generated Event type, so normalise it once here. */
export const eventImages = (event?: Event | null): EventImage[] => event?.images ?? [];

/**
 * Uploads illustrations to the event's Discord post.
 *
 * Hand-written on purpose — do NOT swap this for the generated `useEventImageStore`, which is
 * broken for this endpoint on two counts:
 *   1. it appends each file as `images`, and PHP only keeps the last value of a repeated field
 *      without `[]`, so the array never arrives;
 *   2. it does not override the axios instance's default `Content-Type: application/json`, so the
 *      browser never sets a multipart boundary.
 *
 * It is also a POST rather than part of the event update because PHP never populates $_FILES on
 * PUT/PATCH bodies.
 */
export const eventsImagesStore = (eventId: number, files: File[]) => {
  const data = new FormData();
  files.forEach((file) => data.append("images[]", file));

  return axiosInstance<Event>({
    url: `/events/${eventId}/images`,
    method: "POST",
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const eventsImagesDestroy = (eventId: number, imageId: number) =>
  axiosInstance<Event>({
    url: `/events/${eventId}/images/${imageId}`,
    method: "DELETE",
  });

type StoreVariables = { event: number; files: File[] };
type DestroyVariables = { event: number; image: number };

export const useEventsImagesStore = <TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Event, TError, StoreVariables, TContext>;
}): UseMutationResult<Event, TError, StoreVariables, TContext> => {
  const mutationFn: MutationFunction<Event, StoreVariables> = ({ event, files }) =>
    eventsImagesStore(event, files);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const useEventsImagesDestroy = <TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Event, TError, DestroyVariables, TContext>;
}): UseMutationResult<Event, TError, DestroyVariables, TContext> => {
  const mutationFn: MutationFunction<Event, DestroyVariables> = ({ event, image }) =>
    eventsImagesDestroy(event, image);
  return useMutation({ mutationFn, ...options?.mutation });
};
