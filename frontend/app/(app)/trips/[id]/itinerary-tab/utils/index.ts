import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { parseLocalDate } from "@/utils/date-helpers";
import type { DateItem, DropTarget, GroupedActivities } from "../types";

// ─── Intl Formatters ─────────────────────────────────────────────────────────

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

// ─── Date Helpers ────────────────────────────────────────────────────────────

export function toDateKey(iso: string): string {
  return iso.split("T")[0]!;
}

export function formatDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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

// ─── Activity Helpers ────────────────────────────────────────────────────────

export function groupByTimeOfDay(
  activities: ModelsActivityAPIResponse[],
): GroupedActivities {
  const groups: GroupedActivities = {
    unscheduled: [],
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const activity of activities) {
    const bucket = activity.time_of_day ?? "unscheduled";
    if (bucket in groups) {
      groups[bucket as keyof GroupedActivities].push(activity);
    } else {
      groups.unscheduled.push(activity);
    }
  }

  return groups;
}

export function formatPrice(price?: number): string | null {
  if (price == null) return null;
  if (price === 0) return "Free";
  return `$${price} per person`;
}

// ─── Drag & Drop Helpers ─────────────────────────────────────────────────────

export function dropTargetsEqual(
  a: DropTarget | null,
  b: DropTarget | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === "time" && b.type === "time") return a.key === b.key;
  if (a.type === "date" && b.type === "date") return a.date === b.date;
  return false;
}
