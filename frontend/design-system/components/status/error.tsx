import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
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
  description = "Oops! Something went a bit sideways, but our amazing engineers are on it. Please give it a moment and try refreshing!",
  refresh,
  isBottomSheet,
}) => {
  return (
    <Box flex={1} width="100%" justifyContent="center">
      <Box gap="md" marginBottom="md">
        {!isBottomSheet && <Box width={150} height={150} />}
        <Text variant="smLabel">{title}</Text>
        <Text variant="smDisplay">{description}</Text>
      </Box>
      {refresh && (
        <Button
          layout="textOnly"
          variant="Tertiary"
          label="Reload Page"
          onPress={refresh}
        />
      )}
    </Box>
  );
};

export default ErrorState;
