import { useGetActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { parseLocalDate } from "@/utils/date-helpers";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import type { GroupedActivities } from "../types";
import { groupByTimeOfDay, toDateKey } from "../utils";

type UseItineraryActivitiesParams = {
  tripID: string;
  startDate?: string;
  endDate?: string;
};

export function useItineraryActivities({
  tripID,
  startDate,
  endDate,
}: UseItineraryActivitiesParams) {
  const startDateKey = startDate ? toDateKey(startDate) : null;
  const endDateKey = endDate ? toDateKey(endDate) : null;

  const [selectedDate, setSelectedDate] = useState<string>(startDateKey ?? "");

  if (startDateKey && !selectedDate) {
    setSelectedDate(startDateKey);
  }

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

  const activities = useMemo(
    () => activitiesPage?.items ?? [],
    [activitiesPage],
  );

  const grouped = useMemo(() => groupByTimeOfDay(activities), [activities]);

  const isSelectedDatePast = useMemo(() => {
    if (!selectedDate) return false;
    const selected = parseLocalDate(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  }, [selectedDate]);

  const handleActivityPress = useCallback(
    (activityID: string) => {
      router.push({
        pathname: `/trips/${tripID}/activities/${activityID}` as any,
        params: { tripID },
      });
    },
    [tripID],
  );

  const handleAddActivity = useCallback(
    (timeOfDay?: string) => {
      router.push({
        pathname: `/trips/${tripID}/activities/creation` as any,
        params: {
          date: selectedDate,
          ...(timeOfDay ? { timeOfDay } : {}),
        },
      });
    },
    [tripID, selectedDate],
  );

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

  return {
    startDateKey,
    endDateKey,
    selectedDate,
    setSelectedDate,
    activities,
    grouped: grouped as GroupedActivities,
    isLoading,
    isError,
    refetch,
    isSelectedDatePast,
    dateStrings,
    handleActivityPress,
    handleAddActivity,
  };
}
