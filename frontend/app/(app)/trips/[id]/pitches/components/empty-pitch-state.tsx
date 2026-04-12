import { Box, Text } from "@/design-system";

interface EmptyPitchStateProps {
  hasDeadline: boolean;
}

export function EmptyPitchState({ hasDeadline }: EmptyPitchStateProps) {
  return (
    <Box alignItems="center" gap="xxs" width="100%">
      <Text variant="bodySmMedium" color="gray900">
        {hasDeadline ? "No one has pitched yet" : "Add pitch deadline"}
      </Text>
      <Text
        variant="bodyXsDefault"
        color="gray500"
        textAlign="center"
        style={{ maxWidth: 240 }}
      >
        {hasDeadline
          ? "Be the first to pitch a destination for your trip!"
          : "Set a deadline above before pitching."}
      </Text>
    </Box>
  );
}
