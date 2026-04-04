import { useGetTrip } from "@/api/trips/useGetTrip";
import { Box, Screen } from "@/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { CreatePitchFlowSheet } from "./components/create-pitch-flow-sheet";

export default function CreatePitch() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, isLoading: isTripLoading } = useGetTrip(tripID!);

  useEffect(() => {
    if (isTripLoading) return;
    if (trip?.pitch_deadline) return;
    router.replace(`/trips/${tripID}/pitches`);
  }, [isTripLoading, router, trip?.pitch_deadline, tripID]);

  return (
    <Screen>
      <Box flex={1} backgroundColor="transparent">
        <CreatePitchFlowSheet
          tripID={tripID!}
          visible={true}
          onClose={() => router.replace(`/trips/${tripID}/pitches`)}
        />
      </Box>
    </Screen>
  );
}
