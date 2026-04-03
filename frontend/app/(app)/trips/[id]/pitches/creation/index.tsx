import { Box, Screen, Text } from "@/design-system";

export default function CreatePitch() {
  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        <Box
          padding="lg"
          paddingTop="xl"
          backgroundColor="white"
          gap="xs"
        >
          <Text variant="bodySmMedium" color="gray500">
            NEW
          </Text>
          <Text variant="headingMd" color="gray900">
            Create Pitch
          </Text>
        </Box>
        <Box padding="lg" gap="sm">
          <Box
            backgroundColor="white"
            borderRadius="md"
            padding="md"
            gap="xs"
          >
            <Text variant="bodySmMedium" color="gray500">
              STATUS
            </Text>
            <Text variant="bodyDefault" color="gray900">
              Pitch creation flow: coming soon.
            </Text>
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
