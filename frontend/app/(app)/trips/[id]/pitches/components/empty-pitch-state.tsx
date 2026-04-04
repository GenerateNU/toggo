import { Box, Button, Text } from "@/design-system";

interface EmptyPitchStateProps {
  onPress: () => void;
}

export function EmptyPitchState({ onPress }: EmptyPitchStateProps) {
  return (
    <Box alignItems="center" gap="md" width="100%">
      <Box flexDirection="column" alignItems="center">
        <Text variant="bodySmMedium" color="gray900">
          No one has pitched yet
        </Text>
        <Text variant="bodyXsDefault" color="gray500">
          Be the first to pitch a destination!
        </Text>
      </Box>
      <Box width="100%">
        <Button
          variant="Primary"
          layout="textOnly"
          label="Pitch a destination"
          onPress={onPress}
        />
      </Box>
    </Box>
  );
}
