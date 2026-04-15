import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROW_HEIGHT = 56;
export const SWAP_THRESHOLD = ROW_HEIGHT * 0.5;
export const SPRING_CONFIG = { damping: 20, stiffness: 300 };

// ─── Types ────────────────────────────────────────────────────────────────────

type UseTabReorderParams = {
  tabs: ModelsCategoryAPIResponse[];
  onReorder: (reordered: ModelsCategoryAPIResponse[]) => void;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTabReorder({ tabs, onReorder }: UseTabReorderParams) {
  const [orderedTabs, setOrderedTabs] =
    useState<ModelsCategoryAPIResponse[]>(tabs);
  const [draggingName, setDraggingName] = useState<string | null>(null);

  // Stable ref so onDragEnd can read the latest order without stale closure
  const orderedTabsRef = useRef<ModelsCategoryAPIResponse[]>(tabs);

  // Sync orderedTabs when the tabs prop changes (e.g. after create or hide).
  // Setting state during render is the React-recommended pattern for resetting
  // derived state when a prop changes — React immediately discards the current
  // render and re-runs with the updated state.
  const [prevTabs, setPrevTabs] = useState(tabs);
  if (prevTabs !== tabs) {
    setPrevTabs(tabs);
    setOrderedTabs(tabs);
  }

  const dragIndex = useSharedValue(-1);
  const translateY = useSharedValue(0);
  const swapBudget = useSharedValue(0);
  const listLength = useSharedValue(tabs.length);

  useEffect(() => {
    orderedTabsRef.current = orderedTabs;
    listLength.value = orderedTabs.length;
  }, [orderedTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDragging = useCallback((name: string | null) => {
    setDraggingName(name);
  }, []);

  const doSwap = useCallback((from: number, to: number) => {
    setOrderedTabs((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length)
        return prev;
      const next = [...prev];
      const tmp = next[from]!;
      next[from] = next[to]!;
      next[to] = tmp;
      orderedTabsRef.current = next;
      return next;
    });
  }, []);

  const onDragEnd = useCallback(() => {
    onReorder(orderedTabsRef.current);
  }, [onReorder]);

  return {
    orderedTabs,
    draggingName,
    dragIndex,
    translateY,
    swapBudget,
    listLength,
    setDragging,
    doSwap,
    onDragEnd,
  };
}
