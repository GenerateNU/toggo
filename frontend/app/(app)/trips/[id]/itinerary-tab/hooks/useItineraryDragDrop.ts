import { useUpdateActivity } from "@/api/activities";
import { getActivitiesByTripIDQueryKey } from "@/api/activities/useGetActivitiesByTripID";
import { useToast } from "@/design-system";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScrollView, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import {
  AUTO_SCROLL_EDGE,
  AUTO_SCROLL_SPEED,
  CHIP_SIZE,
  CHIP_TOTAL_WIDTH,
  TIME_SECTIONS,
  TIME_SECTION_LABELS,
  VERTICAL_AUTO_SCROLL_SPEED,
} from "../constants";
import type { DateSelectorHandle, DropTarget } from "../types";
import { dropTargetsEqual, formatDateLabel } from "../utils";

type UseItineraryDragDropParams = {
  tripID: string;
  activities: ModelsActivityAPIResponse[];
  selectedDate: string;
  dateStrings: string[];
  parentScrollViewRef?: React.RefObject<ScrollView | null>;
  parentScrollOffset?: React.RefObject<number>;
  parentContainerRef?: React.RefObject<View | null>;
};

export function useItineraryDragDrop({
  tripID,
  activities,
  selectedDate,
  dateStrings,
  parentScrollViewRef,
  parentScrollOffset,
  parentContainerRef,
}: UseItineraryDragDropParams) {
  const queryClient = useQueryClient();
  const updateActivityMutation = useUpdateActivity();
  const toast = useToast();

  const [hoveredTarget, setHoveredTarget] = useState<DropTarget | null>(null);

  const dateSelectorRef = useRef<DateSelectorHandle>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});

  const draggedActivityIdRef = useRef<string | null>(null);
  const draggedActivityNameRef = useRef<string | null>(null);
  const draggedActivityTimeRef = useRef<string | null>(null);
  const hoveredTargetRef = useRef<DropTarget | null>(null);
  const scrollViewLayoutRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const sectionLayoutsRef = useRef<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});
  const parentContainerLayoutRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const lastAbsXRef = useRef(0);
  const lastAbsYRef = useRef(0);
  const dragStartScrollOffsetRef = useRef(0);
  const dragScrollCompensationY = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  const measureDropZones = useCallback(async () => {
    if (dateSelectorRef.current) {
      scrollViewLayoutRef.current =
        await dateSelectorRef.current.measureScrollView();
    }

    if (parentContainerRef?.current) {
      await new Promise<void>((resolve) => {
        parentContainerRef.current!.measureInWindow((x, y, width, height) => {
          parentContainerLayoutRef.current = { x, y, width, height };
          resolve();
        });
      });
    }

    const layouts: Record<
      string,
      { x: number; y: number; width: number; height: number }
    > = {};
    const promises = Object.entries(sectionRefs.current).map(
      ([key, viewRef]) =>
        new Promise<void>((resolve) => {
          if (viewRef) {
            viewRef.measureInWindow((x, y, width, height) => {
              layouts[key] = { x, y, width, height };
              resolve();
            });
          } else {
            resolve();
          }
        }),
    );
    await Promise.all(promises);
    sectionLayoutsRef.current = layouts;
  }, [parentContainerRef]);

  const findDropTarget = useCallback(
    (absX: number, absY: number): DropTarget | null => {
      const sv = scrollViewLayoutRef.current;
      if (sv && dateSelectorRef.current) {
        const scrollOffset = dateSelectorRef.current.getScrollOffset();
        const paddingLeft = Layout.spacing.sm;

        if (absY >= sv.y && absY <= sv.y + sv.height) {
          const relX = absX - sv.x + scrollOffset - paddingLeft;
          const chipIndex = Math.floor(relX / CHIP_TOTAL_WIDTH);
          const chipStart = chipIndex * CHIP_TOTAL_WIDTH;
          const withinChip = relX - chipStart < CHIP_SIZE;

          if (chipIndex >= 0 && chipIndex < dateStrings.length && withinChip) {
            return { type: "date", date: dateStrings[chipIndex]! };
          }
        }
      }

      for (const [key, layout] of Object.entries(sectionLayoutsRef.current)) {
        if (
          absX >= layout.x &&
          absX <= layout.x + layout.width &&
          absY >= layout.y &&
          absY <= layout.y + layout.height
        ) {
          return { type: "time", key };
        }
      }

      return null;
    },
    [dateStrings],
  );

  const updateHoveredTarget = useCallback((target: DropTarget | null) => {
    if (!dropTargetsEqual(target, hoveredTargetRef.current)) {
      hoveredTargetRef.current = target;
      setHoveredTarget(target);
    }
  }, []);

  const startAutoScroll = () => {
    if (autoScrollIntervalRef.current) return;

    autoScrollIntervalRef.current = setInterval(() => {
      const absX = lastAbsXRef.current;
      const absY = lastAbsYRef.current;
      let scrolled = false;

      // ── Vertical auto-scroll (parent ScrollView) ──
      const container = parentContainerLayoutRef.current;
      if (container && parentScrollViewRef?.current && parentScrollOffset) {
        const topEdge = container.y + AUTO_SCROLL_EDGE;
        const bottomEdge = container.y + container.height - AUTO_SCROLL_EDGE;

        if (absY < topEdge) {
          const newOffset = Math.max(
            0,
            parentScrollOffset.current - VERTICAL_AUTO_SCROLL_SPEED,
          );
          parentScrollViewRef.current.scrollTo({
            y: newOffset,
            animated: false,
          });
          scrolled = true;
        } else if (absY > bottomEdge) {
          const newOffset =
            parentScrollOffset.current + VERTICAL_AUTO_SCROLL_SPEED;
          parentScrollViewRef.current.scrollTo({
            y: newOffset,
            animated: false,
          });
          scrolled = true;
        }

        dragScrollCompensationY.value =
          parentScrollOffset.current - dragStartScrollOffsetRef.current;
      }

      // ── Horizontal auto-scroll (date selector) ──
      const sv = scrollViewLayoutRef.current;
      const adjustedAbsY =
        absY +
        (parentScrollOffset
          ? parentScrollOffset.current - dragStartScrollOffsetRef.current
          : 0);

      if (sv && dateSelectorRef.current) {
        const isNearSelector =
          adjustedAbsY >= sv.y - AUTO_SCROLL_EDGE &&
          adjustedAbsY <= sv.y + sv.height + AUTO_SCROLL_EDGE;

        if (isNearSelector) {
          const leftEdge = sv.x + AUTO_SCROLL_EDGE;
          const rightEdge = sv.x + sv.width - AUTO_SCROLL_EDGE;

          if (absX < leftEdge && absX > sv.x) {
            dateSelectorRef.current.scrollBy(-AUTO_SCROLL_SPEED);
            scrolled = true;
          } else if (absX > rightEdge && absX < sv.x + sv.width) {
            dateSelectorRef.current.scrollBy(AUTO_SCROLL_SPEED);
            scrolled = true;
          }
        }
      }

      if (scrolled) {
        const target = findDropTarget(absX, adjustedAbsY);
        updateHoveredTarget(target);
      }
    }, 16);
  };

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const handleDragStart = async (activityId: string) => {
    draggedActivityIdRef.current = activityId;
    const activity = activities.find((a) => a.id === activityId);
    draggedActivityNameRef.current = activity?.name ?? "Activity";
    draggedActivityTimeRef.current = activity?.time_of_day ?? null;
    dragStartScrollOffsetRef.current = parentScrollOffset?.current ?? 0;
    await measureDropZones();
    startAutoScroll();
  };

  const getAdjustedAbsY = useCallback(
    (absY: number) => {
      const scrollDelta = parentScrollOffset
        ? parentScrollOffset.current - dragStartScrollOffsetRef.current
        : 0;
      return absY + scrollDelta;
    },
    [parentScrollOffset],
  );

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      lastAbsXRef.current = absoluteX;
      lastAbsYRef.current = absoluteY;
      const target = findDropTarget(absoluteX, getAdjustedAbsY(absoluteY));
      updateHoveredTarget(target);
    },
    [findDropTarget, updateHoveredTarget, getAdjustedAbsY],
  );

  const handleDrop = useCallback(async () => {
    stopAutoScroll();

    const activityId = draggedActivityIdRef.current;
    const activityName = draggedActivityNameRef.current ?? "Activity";
    const target = hoveredTargetRef.current;

    const activityTime = draggedActivityTimeRef.current;

    draggedActivityIdRef.current = null;
    draggedActivityNameRef.current = null;
    draggedActivityTimeRef.current = null;
    hoveredTargetRef.current = null;
    setHoveredTarget(null);

    if (!activityId || !target) return;

    // Skip no-op drops: same time section or same date
    const currentTimeKey = activityTime || "unscheduled";
    if (target.type === "time" && target.key === currentTimeKey) return;
    if (target.type === "date" && target.date === selectedDate) return;

    try {
      if (target.type === "time") {
        const timeOfDay = target.key === "unscheduled" ? "" : target.key;
        await updateActivityMutation.mutateAsync({
          tripID,
          activityID: activityId,
          data: { time_of_day: timeOfDay as any },
        });
      } else {
        await updateActivityMutation.mutateAsync({
          tripID,
          activityID: activityId,
          data: {
            dates: [{ start: target.date, end: target.date }],
            time_of_day: "" as any,
          },
        });
      }

      await queryClient.invalidateQueries({
        queryKey: getActivitiesByTripIDQueryKey(tripID),
      });

      if (target.type === "time") {
        const label = TIME_SECTION_LABELS[target.key] ?? target.key;
        toast.show({ message: `"${activityName}" moved to ${label}` });
      } else {
        toast.show({
          message: `"${activityName}" moved to ${formatDateLabel(target.date)}`,
        });
      }
    } catch {
      toast.show({ message: "Failed to move activity. Please try again." });
    }
  }, [tripID, selectedDate, updateActivityMutation, queryClient, stopAutoScroll, toast]);

  const sectionRefCallbacks = useMemo(() => {
    const callbacks: Record<string, (ref: View | null) => void> = {};
    for (const section of TIME_SECTIONS) {
      callbacks[section.key] = (view: View | null) => {
        sectionRefs.current[section.key] = view;
      };
    }
    return callbacks;
  }, []);

  return {
    hoveredTarget,
    dateSelectorRef,
    sectionRefCallbacks,
    dragScrollCompensationY,
    handleDragStart,
    handleDragMove,
    handleDrop,
  };
}
