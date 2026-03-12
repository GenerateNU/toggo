import { Box, Screen, Text } from "@/design-system";

export default function CreatePitch() {
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
            NEW
          </Text>
          <Text variant="lgHeading" color="textSecondary">
            Create Pitch
          </Text>
        </Box>
        <Box padding="lg" gap="sm">
          <Box
            backgroundColor="surfaceCard"
            borderRadius="md"
            padding="md"
            gap="xs"
          >
            <Text variant="smLabel" color="textQuaternary">
              STATUS
            </Text>
            <Text variant="mdParagraph" color="textSecondary">
              Pitch creation flow: coming soon.
            </Text>
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
