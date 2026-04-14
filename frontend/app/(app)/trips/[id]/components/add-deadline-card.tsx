import { Box, Icon, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { PlusIcon } from "lucide-react-native";
import { Pressable } from "react-native";

interface AddDeadlineCardProps {
  title?: string;
  subtitle: string;
  onPress?: () => void;
}

export function AddDeadlineCard({
  title = "Add a deadline",
  subtitle,
  onPress,
}: AddDeadlineCardProps) {
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
        <Box padding="xxs" borderRadius="full" backgroundColor="blue50">
          <Icon icon={PlusIcon} color="blue500" size="md" />
        </Box>
        <Box flex={1} flexDirection="column" gap="xxs">
          <Text variant="headingSm" color="gray900">
            {title}
          </Text>
          <Text variant="bodyXsDefault" color="gray500">
            {subtitle}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}
