import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { AlertCircle } from "lucide-react-native";
import React from "react";
import { Button } from "../buttons/button";

interface ErrorDisplayProps {
  title?: string;
  description?: string;
  refresh?: () => void;
  isBottomSheet?: boolean;
}

const ErrorState: React.FC<ErrorDisplayProps> = ({
  title = "Something went wrong",
  description = "Please give it a moment and try again.",
  refresh,
}) => {
  return (
    <Box alignItems="center" gap="sm" padding="lg">
      <Box
        width={48}
        height={48}
        borderRadius="full"
        backgroundColor="backgroundSubtle"
        alignItems="center"
        justifyContent="center"
      >
        <AlertCircle size={22} color={ColorPalette.textSubtle} />
      </Box>
      <Box alignItems="center" gap="xs">
        <Text variant="bodySmMedium" color="textInverse" textAlign="center">
          {title}
        </Text>
        <Text variant="bodyXsDefault" color="textSubtle" textAlign="center">
          {description}
        </Text>
      </Box>
      {refresh && (
        <Button
          layout="textOnly"
          variant="Tertiary"
          label="Try again"
          onPress={refresh}
        />
      )}
    </Box>
  );
};

export default ErrorState;
