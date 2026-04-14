import { Box, Button } from "@/design-system";

interface PitchCtaBarProps {
  insetBottom: number;
  onPress: () => void;
}

export function PitchCtaBar({ insetBottom, onPress }: PitchCtaBarProps) {
  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      paddingHorizontal="sm"
      paddingTop="sm"
      style={{
        paddingBottom: Math.max(insetBottom, 16),
      }}
    >
      <Button
        layout="textOnly"
        label="Pitch a destination"
        variant="Primary"
        onPress={onPress}
      />
    </Box>
  );
}
