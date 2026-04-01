import { Box, Screen, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";

export default function PitchDetail() {
  const { id: pitchID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  return (
    <Screen>
      <Box flex={1} backgroundColor="backgroundSubtle">
        <Box
          padding="lg"
          paddingTop="xl"
          backgroundColor="backgroundCard"
          gap="xs"
        >
          <Text variant="bodySmMedium" color="textSubtle">
            PITCH
          </Text>
          <Text variant="headingMd" color="textInverse">
            Pitch Detail
          </Text>
        </Box>
        <Box padding="lg" gap="sm">
          <Box
            backgroundColor="backgroundCard"
            borderRadius="md"
            padding="md"
            gap="sm"
          >
            <Box gap="xs">
              <Text variant="bodySmMedium" color="textSubtle">
                PITCH ID
              </Text>
              <Text variant="bodyDefault" color="textInverse">
                {pitchID}
              </Text>
            </Box>
            <Box height={1} backgroundColor="borderDefault" />
            <Box gap="xs">
              <Text variant="bodySmMedium" color="textSubtle">
                TRIP ID
              </Text>
              <Text variant="bodyDefault" color="textInverse">
                {tripID}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
