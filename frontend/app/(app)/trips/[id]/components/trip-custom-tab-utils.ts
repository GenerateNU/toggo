import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { modelsCategoryViewType } from "@/types/types.gen";

/** Tabs handled by explicit routes or screens in `index.tsx`, not category metadata. */
export const TRIP_ROUTED_TAB_KEYS = new Set([
  "new",
  "itinerary",
  "polls",
  "activities",
  "settings", // navigates away; never a category content pane
]);

export function isRoutedTripTab(activeTab: string): boolean {
  return TRIP_ROUTED_TAB_KEYS.has(activeTab);
}

export function findTabMeta(
  tabs: ModelsCategoryAPIResponse[] | undefined,
  name: string,
): ModelsCategoryAPIResponse | undefined {
  return tabs?.find((t) => (t.name ?? "") === name);
}

export function isMoodboardTab(
  meta: ModelsCategoryAPIResponse | undefined,
): boolean {
  return meta?.view_type === modelsCategoryViewType.CategoryViewTypeMoodboard;
}
