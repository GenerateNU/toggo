import { Box, Screen, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";

export default function PollDetail() {
  const { id: pollID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  return (
    <Screen>
      <Box flex={1} backgroundColor="surfaceBackground">
        <Box
          padding="lg"
          paddingTop="xl"
          backgroundColor="surfaceCard"
          gap="xs"
        >
          <Text variant="smLabel" color="textQuaternary">
            POLL
          </Text>
          <Text variant="lgHeading" color="textSecondary">
            Poll Detail
          </Text>
        </Box>
        <Box padding="lg" gap="sm">
          <Box
            backgroundColor="surfaceCard"
            borderRadius="md"
            padding="md"
            gap="sm"
          >
            <Box gap="xs">
              <Text variant="smLabel" color="textQuaternary">
                POLL ID
              </Text>
              <Text variant="mdParagraph" color="textSecondary">
                {pollID}
              </Text>
            </Box>
            <Box height={1} backgroundColor="borderPrimary" />
            <Box gap="xs">
              <Text variant="smLabel" color="textQuaternary">
                TRIP ID
              </Text>
              <Text variant="mdParagraph" color="textSecondary">
                {tripID}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
