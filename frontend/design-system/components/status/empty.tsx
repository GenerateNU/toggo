import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { Inbox } from "lucide-react-native";
import { ReactNode } from "react";

interface EmptyStateProps {
  children?: ReactNode;
  title?: string;
  description?: string;
}

const EmptyState = ({
  children,
  title = "Nothing to see here!",
  description,
}: EmptyStateProps) => {
  return (
    <Box alignItems="center" gap="sm" padding="lg">
      <Box
        width={48}
        height={48}
        borderRadius="full"
        backgroundColor="gray50"
        alignItems="center"
        justifyContent="center"
      >
        <Inbox size={22} color={ColorPalette.gray500} />
      </Box>
      <Box alignItems="center" gap="xs">
        <Text variant="bodySmMedium" color="gray900" textAlign="center">
          {title}
        </Text>
        {description && (
          <Text variant="bodyXsDefault" color="gray500" textAlign="center">
            {description}
          </Text>
        )}
      </Box>
      {children}
    </Box>
  );
};

export default EmptyState;
