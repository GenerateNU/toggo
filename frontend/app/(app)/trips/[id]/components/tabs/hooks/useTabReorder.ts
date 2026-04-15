import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROW_HEIGHT = 56;
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

  // Sync orderedTabs when the tabs prop changes (e.g. after create or hide)
  useEffect(() => {
    setOrderedTabs(tabs);
  }, [tabs]);

  const dragIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const activeIndex = useRef(-1);

  const commitReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const reordered = [...orderedTabs];
      const [moved] = reordered.splice(fromIndex, 1);
      if (moved) {
        reordered.splice(toIndex, 0, moved);
        setOrderedTabs(reordered);
        onReorder(reordered);
      }
    },
    [orderedTabs, onReorder],
  );

  const onDragStart = useCallback((index: number) => {
    activeIndex.current = index;
  }, []);

  const onDragEnd = useCallback(
    (translationY: number) => {
      const fromIndex = activeIndex.current;
      const toIndex = Math.round(
        Math.max(
          0,
          Math.min(
            orderedTabs.length - 1,
            fromIndex + translationY / ROW_HEIGHT,
          ),
        ),
      );
      activeIndex.current = -1;
      commitReorder(fromIndex, toIndex);
    },
    [orderedTabs.length, commitReorder],
  );

  return {
    orderedTabs,
    dragIndex,
    dragY,
    onDragStart,
    onDragEnd,
  };
}