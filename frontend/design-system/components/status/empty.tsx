import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ReactNode } from "react";

interface EmptyStateProps {
  children?: ReactNode;
  title?: string;
}

const EmptyState = ({
  children,
  title = "Nothing to see here!",
}: EmptyStateProps) => {
  return (
    <Box flex={1} width="100%" gap="md" justifyContent="center">
      <Box width="100%" alignContent="center" gap="md">
        <Box width="100%" marginTop="md">
          <Text variant="smDisplay">{title}</Text>
        </Box>
      </Box>
      {children}
    </Box>
  );
};

export default EmptyState;
