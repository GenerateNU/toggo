import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Plus } from "lucide-react-native";
import { ActivityIndicator, Pressable } from "react-native";

type TripsSectionHeaderProps = {
  onCreateTrip: () => void;
  isCreating: boolean;
};

export function TripsSectionHeader({
  onCreateTrip,
  isCreating,
}: TripsSectionHeaderProps) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal="sm"
      paddingTop="xs"
    >
      <Text variant="bodySmMedium" color="gray500">
        MY TRIPS
      </Text>
      <Pressable
        onPress={onCreateTrip}
        disabled={isCreating}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          gap="xxs"
          paddingHorizontal="sm"
          paddingVertical="xxs"
          borderRadius="xl"
          backgroundColor="brand500"
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={ColorPalette.gray900} />
          ) : (
            <Plus size={14} color={ColorPalette.gray900} />
          )}
          <Text variant="bodyXsMedium" color="gray900">
            New Trip
          </Text>
        </Box>
      </Pressable>
    </Box>
  );
}
