import { Box, Icon, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { PlusIcon } from "lucide-react-native";
import { Pressable } from "react-native";

interface AddDeadlineProps {
  onPress?: () => void;
}

export function AddDeadline({ onPress }: AddDeadlineProps) {
  return (
    <Pressable onPress={onPress}>
      <Box
        padding="sm"
        gap="sm"
        flexDirection="row"
        alignItems="center"
        borderColor="blue100"
        borderWidth={1}
        borderRadius="lg"
        backgroundColor="blue25"
        style={{
          shadowColor: ColorPalette.blue500,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <PlusButton />
        <Box flex={1} flexDirection="column" gap="xxs">
          <Text variant="headingSm" color="gray900">
            Add a deadline
          </Text>
          <Text variant="bodySmDefault" color="gray500">
            Start a timer to encourage participants to pitch locations
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}

function PlusButton() {
  return (
    <Box padding="xxs" borderRadius="full" backgroundColor="blue50">
      <Icon icon={PlusIcon} color="blue500" size="md" />
    </Box>
  );
}
