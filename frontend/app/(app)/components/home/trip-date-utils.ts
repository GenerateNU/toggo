import type { ModelsTripAPIResponse } from "@/types/types.gen";
import {
  HOME_NULL_DATE_DISPLAY,
  NULL_DATE_DISPLAY_OPTIONS,
  type NullDateDisplayOption,
} from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isBeforeToday(date: Date, now: Date): boolean {
  return toDayStart(date).getTime() < toDayStart(now).getTime();
}

function formatShortMonthDay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTripDateLabel(
  trip: ModelsTripAPIResponse,
  nullDateDisplay: NullDateDisplayOption = HOME_NULL_DATE_DISPLAY,
): string | null {
  const start = toDate(trip.start_date);
  const end = toDate(trip.end_date);

  if (start && end) {
    return `${formatShortMonthDay(start)}–${formatShortMonthDay(end)}`;
  }

  if (nullDateDisplay === NULL_DATE_DISPLAY_OPTIONS.hide) return null;

  if (nullDateDisplay === NULL_DATE_DISPLAY_OPTIONS.partialOnly) {
    if (start) return `Starts ${formatShortMonthDay(start)}`;
    if (end) return `Ends ${formatShortMonthDay(end)}`;
    return null;
  }

  if (start) return `Starts ${formatShortMonthDay(start)}`;
  if (end) return `Ends ${formatShortMonthDay(end)}`;
  return "Dates TBD";
}

export function partitionTripsForHome(
  trips: ModelsTripAPIResponse[],
  now = new Date(),
) {
  const dated = [...trips];
  const upcoming: ModelsTripAPIResponse[] = [];
  const past: ModelsTripAPIResponse[] = [];

  for (const trip of dated) {
    const end = toDate(trip.end_date);
    if (end && isBeforeToday(end, now)) {
      past.push(trip);
      continue;
    }
    upcoming.push(trip);
  }

  upcoming.sort((a, b) => {
    const startA = toDate(a.start_date);
    const startB = toDate(b.start_date);
    if (startA && startB) return startA.getTime() - startB.getTime();
    if (startA) return -1;
    if (startB) return 1;
    const endA = toDate(a.end_date);
    const endB = toDate(b.end_date);
    if (endA && endB) return endA.getTime() - endB.getTime();
    if (endA) return -1;
    if (endB) return 1;
    return 0;
  });

  past.sort((a, b) => {
    const endA = toDate(a.end_date);
    const endB = toDate(b.end_date);
    if (endA && endB) return endB.getTime() - endA.getTime();
    if (endA) return -1;
    if (endB) return 1;
    const createdA = toDate(a.created_at)?.getTime() ?? 0;
    const createdB = toDate(b.created_at)?.getTime() ?? 0;
    return createdB - createdA;
  });

  return { upcoming, past };
}

export function getUpcomingTrip(
  trips: ModelsTripAPIResponse[],
): ModelsTripAPIResponse | null {
  return trips[0] ?? null;
}

export function getPastTrips(
  trips: ModelsTripAPIResponse[],
): ModelsTripAPIResponse[] {
  if (trips.length <= 1) return [];
  return trips.slice(1);
}

export function fallbackRangeFromCreatedAt(
  createdAt?: string,
  durationDays = 4,
): { start?: string; end?: string } {
  const created = toDate(createdAt);
  if (!created) return {};
  const start = new Date(created);
  const end = new Date(start.getTime() + durationDays * DAY_MS);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
