import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import type { DropTarget, GroupedActivities } from "../types";

export {
  formatDateLabel,
  generateDateRange,
  toDateKey,
} from "@/utils/date-helpers";

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
