import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { DateRangePicker, useToast } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { parseLocalDate } from "@/utils/date-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

const getInitialRange = (startDate?: string, endDate?: string): DateRange => ({
  start: startDate ? parseLocalDate(startDate) : null,
  end: endDate ? parseLocalDate(endDate) : null,
});

export default function EditTripDates() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: trip } = useGetTrip(tripID!);
  const updateTripMutation = useUpdateTrip();
  const initialRange = getInitialRange(trip?.start_date, trip?.end_date);

  const handleSave = (range: DateRange) => {
    if (!range.start) return;

    const startChanged =
      range.start.toISOString() !== initialRange.start?.toISOString();
    const endChanged =
      range.end?.toISOString() !== initialRange.end?.toISOString();
    if (!startChanged && !endChanged) return;

    updateTripMutation.mutate(
      {
        tripID: tripID!,
        data: {
          start_date: range.start.toISOString(),
          ...(range.end ? { end_date: range.end.toISOString() } : {}),
        },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getTripQueryKey(tripID!),
            }),
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY }),
            queryClient.invalidateQueries({
              queryKey: getAllTripsQueryKey({}),
            }),
          ]);
          toast.show({ message: "Trip dates updated." });
        },
        onError: () => {
          toast.show({ message: "Couldn't update dates. Please try again." });
        },
      },
    );
  };

  return (
    <>
      <View style={{ flex: 1 }} />
      <DateRangePicker
        visible={true}
        onClose={() => router.back()}
        onSave={handleSave}
        initialRange={initialRange}
        minDate={new Date()}
      />
    </>
  );
}
