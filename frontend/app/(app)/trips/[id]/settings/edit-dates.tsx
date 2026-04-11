import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { Box, Button, DateRangePicker, Text, useToast } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { formatTripDates, parseLocalDate } from "@/utils/date-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

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

  const [draftRange, setDraftRange] = useState<DateRange | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const initialRange = getInitialRange(trip?.start_date, trip?.end_date);
  const range = draftRange ?? initialRange;

  const formattedDates = formatTripDates(
    range.start?.toISOString(),
    range.end?.toISOString(),
  );

  const handleSave = async () => {
    if (!range.start) {
      return;
    }

    const startChanged =
      range.start?.toISOString() !== initialRange.start?.toISOString();
    const endChanged =
      range.end?.toISOString() !== initialRange.end?.toISOString();

    if (!startChanged && !endChanged) {
      router.back();
      return;
    }

    try {
      await updateTripMutation.mutateAsync({
        tripID: tripID!,
        data: {
          start_date: range.start.toISOString(),
          ...(range.end ? { end_date: range.end.toISOString() } : {}),
        },
      });
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
      router.back();
    } catch {
      toast.show({ message: "Couldn't update dates. Please try again." });
    }
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: ColorPalette.white }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Box gap="xs">
          <Text variant="bodySmMedium" color="gray500" marginLeft="xs">
            Dates
          </Text>

          <Pressable
            onPress={() => setIsPickerVisible(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Edit trip dates"
          >
            <Box
              style={styles.dateField}
              flexDirection="row"
              alignItems="center"
              gap="xs"
            >
              <Calendar size={16} color={ColorPalette.gray500} />
              <Text
                variant="bodyDefault"
                color={formattedDates ? "gray900" : "gray500"}
              >
                {formattedDates ?? "Select dates"}
              </Text>
            </Box>
          </Pressable>
        </Box>

        <Button
          layout="textOnly"
          label="Save"
          variant="Primary"
          loading={updateTripMutation.isPending}
          loadingLabel="Saving..."
          disabled={!range.start || updateTripMutation.isPending}
          onPress={handleSave}
        />
      </ScrollView>

      <DateRangePicker
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSave={(nextRange) => {
          setDraftRange(nextRange);
          setIsPickerVisible(false);
        }}
        initialRange={range}
        minDate={new Date()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dateField: {
    borderWidth: 1,
    borderColor: ColorPalette.gray300,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
  },
});
