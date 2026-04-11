import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { Box, Text, TextField, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView } from "react-native";

export default function EditTripName() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: trip } = useGetTrip(tripID!);
  const updateTripMutation = useUpdateTrip();

  const [draftName, setDraftName] = useState<string | null>(null);
  const name = draftName ?? trip?.name ?? "";

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === trip?.name) {
      router.back();
      return;
    }
    try {
      await updateTripMutation.mutateAsync({
        tripID: tripID!,
        data: {
          name: trimmed,
          budget_min: trip?.budget_min,
          budget_max: trip?.budget_max,
          currency: trip?.currency,
        },
      });
      await queryClient.invalidateQueries({
        queryKey: getTripQueryKey(tripID!),
      });
      await queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: getAllTripsQueryKey({}),
      });
      toast.show({ message: "Trip name updated." });
      router.back();
    } catch {
      toast.show({ message: "Couldn't update name. Please try again." });
    }
  }, [name, trip, tripID, updateTripMutation, queryClient, toast]);

  const isDoneDisabled = !name.trim() || updateTripMutation.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              hitSlop={8}
              disabled={isDoneDisabled}
            >
              <Text
                variant="bodySmMedium"
                style={{
                  color: isDoneDisabled
                    ? ColorPalette.gray400
                    : ColorPalette.blue500,
                }}
              >
                {updateTripMutation.isPending ? "Saving…" : "Done"}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: ColorPalette.white }}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Box gap="xs">
          <Text variant="bodySmMedium" color="gray500" marginLeft="xs">
            Trip Name
          </Text>
          <TextField
            value={name}
            onChangeText={setDraftName}
            placeholder="Enter trip name"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            autoCapitalize="words"
          />
        </Box>
      </ScrollView>
    </>
  );
}
