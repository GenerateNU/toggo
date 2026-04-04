import { Box, Icon, Text } from "@/design-system";
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
        borderColor="gray200"
        borderWidth={1}
        borderRadius="lg"
        backgroundColor="gray25"
      >
        <PlusButton />
        <Box flex={1} flexDirection="column" gap="xxs">
          <Text variant="bodySmMedium">Add a deadline</Text>
          <Text variant="bodyXsDefault" color="gray400">
            Start a timer to encourage participants to pitch locations
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}

function PlusButton() {
  return (
    <Box padding="xxs" borderRadius="full" backgroundColor="gray100">
      <Icon icon={PlusIcon} color="black" size="md" />
    </Box>
  );
}
