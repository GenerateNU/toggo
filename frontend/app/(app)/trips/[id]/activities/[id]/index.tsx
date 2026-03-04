import { Box, Screen, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";

export default function ActivityDetail() {
  const { id: activityID, tripID } = useLocalSearchParams<{
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
            ACTIVITY
          </Text>
          <Text variant="lgHeading" color="textSecondary">
            Activity Detail
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
                ACTIVITY ID
              </Text>
              <Text variant="mdParagraph" color="textSecondary">
                {activityID}
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
