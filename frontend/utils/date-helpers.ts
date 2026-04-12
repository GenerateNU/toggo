const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

/**
 * Parses an ISO date string (e.g. "2026-04-10" or "2026-04-10T00:00:00Z")
 * into a local-timezone Date, avoiding the off-by-one bug that occurs when
 * `new Date("YYYY-MM-DD")` is interpreted as UTC midnight.
 */
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("T")[0]!.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/**
 * Strips the time portion from an ISO date string, returning "YYYY-MM-DD".
 */
export function toDateKey(iso: string): string {
  return iso.split("T")[0]!;
}

/**
 * Formats a date string into a short human-readable label.
 *
 * Example: "2026-04-10" → "Thu, Apr 10"
 */
export function formatDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Date Range ─────────────────────────────────────────────────────────────

export type DateItem = {
  dateString: string;
  dayAbbrev: string;
  dayNumber: number;
  monthAbbrev: string;
};

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

/**
 * Generates an array of DateItems for every day in the given ISO date range.
 */
export function generateDateRange(
  startISO: string,
  endISO: string,
): DateItem[] {
  const start = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  const dates: DateItem[] = [];

  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    dates.push({
      dateString: `${year}-${month}-${day}`,
      dayAbbrev: dayFormatter.format(current).toUpperCase(),
      dayNumber: current.getDate(),
      monthAbbrev: monthFormatter.format(current).toUpperCase(),
    });

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ─── Trip Dates ─────────────────────────────────────────────────────────────

/**
 * Formats a start/end ISO date pair into a human-readable range.
 *
 * Examples:
 *  - ("2026-04-10")            → "Apr 10"
 *  - ("2026-04-10", "2026-04-15") → "Apr 10 – Apr 15"
 */
export function formatTripDates(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate) return null;
  const start = parseLocalDate(startDate).toLocaleDateString(
    "en-US",
    DATE_FORMAT_OPTIONS,
  );
  if (!endDate) return start;
  const end = parseLocalDate(endDate).toLocaleDateString(
    "en-US",
    DATE_FORMAT_OPTIONS,
  );
  return `${start} - ${end}`;
}

