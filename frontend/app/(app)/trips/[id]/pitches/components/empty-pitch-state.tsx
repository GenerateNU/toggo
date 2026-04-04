import { Box, Button, Text } from "@/design-system";

interface EmptyPitchStateProps {
  onPress: () => void;
  hasDeadline: boolean;
}

export function EmptyPitchState({
  onPress,
  hasDeadline,
}: EmptyPitchStateProps) {
  return (
    <Box alignItems="center" gap="md" width="100%">
      <Box flexDirection="column" alignItems="center">
        <Text variant="bodySmMedium" color="gray900">
          {hasDeadline ? "No one has pitched yet" : "Add pitch deadline"}
        </Text>
        <Text variant="bodyXsDefault" color="gray500">
          {hasDeadline
            ? "Be the first to pitch a destination for your trip!"
            : "Set a deadline above before pitching."}
        </Text>
      </Box>
      <Box width="100%">
        <Button
          variant="Primary"
          layout="textOnly"
          label="Pitch a destination"
          onPress={onPress}
          disabled={!hasDeadline}
        />
      </Box>
    </Box>
  );
}
