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
  return `${start}-${end}`;
}
