import { useMutation } from "@tanstack/react-query";
import type {
  MutationFunction,
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import { axiosInstance } from "./axios-instance";
import type { ErrorType } from "./axios-instance";
import type { Event } from "./generated/model";

type RegisterBody = { user_id: number };
type Variables = { event: number; data: RegisterBody };

const makeHook =
  <T>(fn: (eventId: number, data: RegisterBody) => Promise<T>) =>
  <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<T>, TError, Variables, TContext>;
  }): UseMutationResult<Awaited<T>, TError, Variables, TContext> => {
    const mutationFn: MutationFunction<Awaited<T>, Variables> = ({ event, data }) =>
      fn(event, data) as Promise<Awaited<T>>;
    return useMutation({ mutationFn, ...options?.mutation });
  };

export const eventsRegister = (eventId: number, data: RegisterBody) =>
  axiosInstance<Event>({ url: `/events/${eventId}/register`, method: "POST", data });

export const eventsUnregister = (eventId: number, data: RegisterBody) =>
  axiosInstance<Event>({ url: `/events/${eventId}/unregister`, method: "POST", data });

export const useEventsRegister = makeHook(eventsRegister);
export const useEventsUnregister = makeHook(eventsUnregister);
