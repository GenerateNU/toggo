import { Box, Screen, Text } from "@/design-system";

export default function CreatePitch() {
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
            NEW
          </Text>
          <Text variant="headingMd" color="textInverse">
            Create Pitch
          </Text>
        </Box>
        <Box padding="lg" gap="sm">
          <Box
            backgroundColor="backgroundCard"
            borderRadius="md"
            padding="md"
            gap="xs"
          >
            <Text variant="bodySmMedium" color="textSubtle">
              STATUS
            </Text>
            <Text variant="bodyDefault" color="textInverse">
              Pitch creation flow: coming soon.
            </Text>
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
