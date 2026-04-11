import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { Box, Button, Text, TextField, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { useState } from "react";
import { ScrollView } from "react-native";

export default function EditTripName() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: trip } = useGetTrip(tripID!);
  const updateTripMutation = useUpdateTrip();

  const [draftName, setDraftName] = useState<string | null>(null);
  const name = draftName ?? trip?.name ?? "";

  const handleSave = async () => {
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
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ColorPalette.white }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
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
        />
      </Box>
      <Button
        layout="textOnly"
        label="Save"
        variant="Primary"
        loading={updateTripMutation.isPending}
        loadingLabel="Saving..."
        disabled={!name.trim() || updateTripMutation.isPending}
        onPress={handleSave}
      />
    </ScrollView>
  );
}
