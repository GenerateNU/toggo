import { Box, Text } from "@/design-system";

export default function CreatePoll() {
  return (
    <Box flex={1} backgroundColor="surfaceBackground">
      <Box padding="lg" paddingTop="xl" backgroundColor="surfaceCard" gap="xs">
        <Text variant="smLabel" color="textQuaternary">
          NEW
        </Text>
        <Text variant="lgHeading" color="textSecondary">
          Create Poll
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
            Poll creation flow: coming soon.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
