import { Box, Screen, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";

export default function PitchDetail() {
  const { id: pitchID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        <Box padding="lg" paddingTop="xl" backgroundColor="white" gap="xs">
          <Text variant="bodySmMedium" color="gray500">
            PITCH
          </Text>
          <Text variant="headingMd" color="gray900">
            Pitch Detail
          </Text>
        </Box>
        <Box padding="lg" gap="sm">
          <Box backgroundColor="white" borderRadius="md" padding="md" gap="sm">
            <Box gap="xs">
              <Text variant="bodySmMedium" color="gray500">
                PITCH ID
              </Text>
              <Text variant="bodyDefault" color="gray900">
                {pitchID}
              </Text>
            </Box>
            <Box height={1} backgroundColor="gray300" />
            <Box gap="xs">
              <Text variant="bodySmMedium" color="gray500">
                TRIP ID
              </Text>
              <Text variant="bodyDefault" color="gray900">
                {tripID}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
