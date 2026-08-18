import { addMinutes } from "date-fns";

/** Canonical duration string, hours unbounded: "04:30", "48:30", "120:00". */
const CANONICAL_DURATION = /^(\d+):([0-5]\d)$/;

/** Shortest bookable session. Shorter entries are clamped up to it. */
export const MIN_EVENT_DURATION = "00:15";

function durationToMinutes(duration: string): number | null {
  const match = CANONICAL_DURATION.exec(duration);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function minutesToDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function clampDuration(duration: string, min?: string, max?: string): string {
  let minutes = durationToMinutes(duration) ?? 0;
  const lower = min ? (durationToMinutes(min) ?? 0) : 0;
  const upper = max ? durationToMinutes(max) : null;
  minutes = Math.max(minutes, lower);
  if (upper !== null) minutes = Math.min(minutes, upper);
  return minutesToDuration(minutes);
}

/**
 * Duration covered by an interval. Floored, not rounded: free slots for unlimited
 * rooms end at 23:59:59 (RoomController::freeSlots uses endOfDay), and rounding
 * would push the derived end one second past the slot, un-highlighting the badge.
 */
export function durationBetween(start: Date, end: Date): string {
  return minutesToDuration(Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000)));
}

/** Absolute (elapsed-time) addition, so end - start === duration exactly, DST included. */
export function addDuration(start: Date, duration: string): Date {
  return addMinutes(start, durationToMinutes(duration) ?? 0);
}

/** Human label: "4h", "4h30", "0h30", "48h30". */
export function formatDurationLabel(duration: string): string {
  const minutes = durationToMinutes(duration);
  if (minutes === null) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}
