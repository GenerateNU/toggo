import {
  getActivitiesByTripIDQueryKey,
  useGetActivitiesByTripID,
} from "@/api/activities/useGetActivitiesByTripID";
import { useUpdateActivity } from "@/api/activities";
import { Box, ErrorState, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { parseLocalDate } from "@/utils/date-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, type ScrollView, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import ItineraryDateSelector, {
  CHIP_SIZE,
  CHIP_TOTAL_WIDTH,
  type DateSelectorHandle,
} from "./itinerary-date-selector";
import ItineraryEmptyState from "./itinerary-empty-state";
import ItineraryTimeSection from "./itinerary-time-section";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SECTIONS = [
  { key: "unscheduled", title: "Unscheduled" },
  { key: "morning", title: "Morning" },
  { key: "afternoon", title: "Afternoon" },
  { key: "evening", title: "Evening" },
] as const;

const AUTO_SCROLL_EDGE = 50;
const AUTO_SCROLL_SPEED = 5;
const VERTICAL_AUTO_SCROLL_SPEED = 8;

const TIME_SECTION_LABELS: Record<string, string> = {
  unscheduled: "Unscheduled",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ItineraryTabContentProps = {
  tripID: string;
  startDate?: string;
  endDate?: string;
  parentScrollViewRef?: React.RefObject<ScrollView | null>;
  parentScrollOffset?: React.RefObject<number>;
  parentContainerRef?: React.RefObject<View | null>;
};

type GroupedActivities = {
  unscheduled: ModelsActivityAPIResponse[];
  morning: ModelsActivityAPIResponse[];
  afternoon: ModelsActivityAPIResponse[];
  evening: ModelsActivityAPIResponse[];
};

type DropTarget =
  | { type: "time"; key: string }
  | { type: "date"; date: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso: string): string {
  return iso.split("T")[0]!;
}

function formatDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupByTimeOfDay(
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

function dropTargetsEqual(
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryTabContent({
  tripID,
  startDate,
  endDate,
  parentScrollViewRef,
  parentScrollOffset,
  parentContainerRef,
}: ItineraryTabContentProps) {
  const startDateKey = startDate ? toDateKey(startDate) : null;
  const endDateKey = endDate ? toDateKey(endDate) : null;

  const [selectedDate, setSelectedDate] = useState<string>(
    startDateKey ?? "",
  );

  useEffect(() => {
    if (startDateKey && !selectedDate) {
      setSelectedDate(startDateKey);
    }
  }, [startDateKey, selectedDate]);

  const {
    data: activitiesPage,
    isLoading,
    isError,
    refetch,
  } = useGetActivitiesByTripID(
    tripID,
    { date: selectedDate },
    { query: { enabled: !!selectedDate } },
  );

  const activities = activitiesPage?.items ?? [];
  const grouped = useMemo(() => groupByTimeOfDay(activities), [activities]);

  const handleActivityPress = useCallback(
    (activityID: string) => {
      router.push(`/trips/${tripID}/activities/${activityID}` as any);
    },
    [tripID],
  );

  const isSelectedDatePast = useMemo(() => {
    if (!selectedDate) return false;
    const selected = parseLocalDate(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  }, [selectedDate]);

  const handleAddActivity = useCallback(() => {
    router.push({
      pathname: `/trips/${tripID}/activities/creation` as any,
      params: { date: selectedDate },
    });
  }, [tripID, selectedDate]);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const queryClient = useQueryClient();
  const updateActivityMutation = useUpdateActivity();
  const toast = useToast();

  const [hoveredTarget, setHoveredTarget] = useState<DropTarget | null>(null);

  const dateSelectorRef = useRef<DateSelectorHandle>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});

  const draggedActivityIdRef = useRef<string | null>(null);
  const draggedActivityNameRef = useRef<string | null>(null);
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

  // Clean up auto-scroll interval on unmount
  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  const dateStrings = useMemo(() => {
    if (!startDateKey || !endDateKey) return [];
    const start = parseLocalDate(startDateKey);
    const end = parseLocalDate(endDateKey);
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDateKey, endDateKey]);

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

          if (
            chipIndex >= 0 &&
            chipIndex < dateStrings.length &&
            withinChip
          ) {
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

  const updateHoveredTarget = useCallback(
    (target: DropTarget | null) => {
      if (!dropTargetsEqual(target, hoveredTargetRef.current)) {
        hoveredTargetRef.current = target;
        setHoveredTarget(target);
      }
    },
    [],
  );

  const startAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) return;

    autoScrollIntervalRef.current = setInterval(() => {
      const absX = lastAbsXRef.current;
      const absY = lastAbsYRef.current;

      // ── Vertical auto-scroll (parent ScrollView) ──
      const container = parentContainerLayoutRef.current;
      if (
        container &&
        parentScrollViewRef?.current &&
        parentScrollOffset
      ) {
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
        } else if (absY > bottomEdge) {
          const newOffset =
            parentScrollOffset.current + VERTICAL_AUTO_SCROLL_SPEED;
          parentScrollViewRef.current.scrollTo({
            y: newOffset,
            animated: false,
          });
        }

        // Derive compensation from actual scroll delta — naturally bounded
        // by scroll view content limits via the onScroll-driven ref
        dragScrollCompensationY.value =
          parentScrollOffset.current - dragStartScrollOffsetRef.current;
      }

      // ── Horizontal auto-scroll (date selector) ──
      const sv = scrollViewLayoutRef.current;
      if (!sv || !dateSelectorRef.current) return;

      // Adjust absY to account for parent scroll delta since drag start
      const adjustedAbsY = absY + (parentScrollOffset
        ? parentScrollOffset.current - dragStartScrollOffsetRef.current
        : 0);

      // Only horizontal auto-scroll when finger is vertically near the date selector
      if (
        adjustedAbsY < sv.y - AUTO_SCROLL_EDGE ||
        adjustedAbsY > sv.y + sv.height + AUTO_SCROLL_EDGE
      ) {
        return;
      }

      const leftEdge = sv.x + AUTO_SCROLL_EDGE;
      const rightEdge = sv.x + sv.width - AUTO_SCROLL_EDGE;

      let scrolled = false;
      if (absX < leftEdge && absX > sv.x) {
        dateSelectorRef.current.scrollBy(-AUTO_SCROLL_SPEED);
        scrolled = true;
      } else if (absX > rightEdge && absX < sv.x + sv.width) {
        dateSelectorRef.current.scrollBy(AUTO_SCROLL_SPEED);
        scrolled = true;
      }

      if (scrolled) {
        const target = findDropTarget(absX, adjustedAbsY);
        updateHoveredTarget(target);
      }
    }, 16);
  }, [
    findDropTarget,
    updateHoveredTarget,
    parentScrollViewRef,
    parentScrollOffset,
    dragScrollCompensationY,
  ]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const handleDragStart = useCallback(
    async (activityId: string) => {
      draggedActivityIdRef.current = activityId;
      const activity = activities.find((a) => a.id === activityId);
      draggedActivityNameRef.current = activity?.name ?? "Activity";
      dragStartScrollOffsetRef.current = parentScrollOffset?.current ?? 0;
      dragScrollCompensationY.value = 0;
      await measureDropZones();
      startAutoScroll();
    },
    [
      activities,
      measureDropZones,
      startAutoScroll,
      dragScrollCompensationY,
      parentScrollOffset,
    ],
  );

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

    draggedActivityIdRef.current = null;
    draggedActivityNameRef.current = null;
    hoveredTargetRef.current = null;
    setHoveredTarget(null);

    if (!activityId || !target) return;

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

      // Invalidate all activity queries for this trip (any date)
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
  }, [tripID, updateActivityMutation, queryClient, stopAutoScroll, toast]);

  // ─── Section ref callbacks (stable references) ────────────────────────────

  const sectionRefCallbacks = useMemo(() => {
    const callbacks: Record<string, (ref: View | null) => void> = {};
    for (const section of TIME_SECTIONS) {
      callbacks[section.key] = (view: View | null) => {
        sectionRefs.current[section.key] = view;
      };
    }
    return callbacks;
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!startDateKey || !endDateKey) {
    return <ItineraryEmptyState />;
  }

  return (
    <Box gap="sm">
      <ItineraryDateSelector
        ref={dateSelectorRef}
        startDate={startDateKey}
        endDate={endDateKey}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        hoveredDate={
          hoveredTarget?.type === "date" ? hoveredTarget.date : null
        }
      />

      {isLoading && (
        <Box alignItems="center" paddingVertical="xl">
          <ActivityIndicator color={ColorPalette.brand500} />
        </Box>
      )}

      {isError && (
        <ErrorState title="Couldn't load activities" refresh={refetch} />
      )}

      {!isLoading && !isError && (
        <Box gap="xs">
          {TIME_SECTIONS.map((section) => {
            const sectionActivities =
              grouped[section.key as keyof GroupedActivities];
            return (
              <ItineraryTimeSection
                key={section.key}
                ref={sectionRefCallbacks[section.key]}
                title={section.title}
                activities={sectionActivities}
                onActivityPress={handleActivityPress}
                onAddActivity={handleAddActivity}
                hideAddButton={isSelectedDatePast}
                isDropHovered={
                  hoveredTarget?.type === "time" &&
                  hoveredTarget.key === section.key
                }
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDrop}
                dragScrollCompensationY={dragScrollCompensationY}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default ItineraryTabContent;
