import { useGetActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { Box, ErrorState } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { router } from "expo-router";
import { parseLocalDate } from "@/utils/date-helpers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import ItineraryDateSelector from "./itinerary-date-selector";
import ItineraryEmptyState from "./itinerary-empty-state";
import ItineraryTimeSection from "./itinerary-time-section";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SECTIONS = [
  { key: "unscheduled", title: "Unscheduled" },
  { key: "morning", title: "Morning" },
  { key: "afternoon", title: "Afternoon" },
  { key: "evening", title: "Evening" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type ItineraryTabContentProps = {
  tripID: string;
  startDate?: string;
  endDate?: string;
};

type GroupedActivities = {
  unscheduled: ModelsActivityAPIResponse[];
  morning: ModelsActivityAPIResponse[];
  afternoon: ModelsActivityAPIResponse[];
  evening: ModelsActivityAPIResponse[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso: string): string {
  return iso.split("T")[0]!;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryTabContent({
  tripID,
  startDate,
  endDate,
}: ItineraryTabContentProps) {
  const startDateKey = startDate ? toDateKey(startDate) : null;
  const endDateKey = endDate ? toDateKey(endDate) : null;

  const [selectedDate, setSelectedDate] = useState<string>(
    startDateKey ?? "",
  );

  // Sync selectedDate when trip dates load asynchronously
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

  if (!startDateKey || !endDateKey) {
    return <ItineraryEmptyState />;
  }

  return (
    <Box gap="sm">
      <ItineraryDateSelector
        startDate={startDateKey}
        endDate={endDateKey}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
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
                key={`${section.key}-${selectedDate}`}
                title={section.title}
                activities={sectionActivities}
                defaultExpanded
                onActivityPress={handleActivityPress}
                onAddActivity={handleAddActivity}
                hideAddButton={isSelectedDatePast}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default ItineraryTabContent;
