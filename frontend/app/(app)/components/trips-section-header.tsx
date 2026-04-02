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
      <Text variant="bodySmMedium" color="textSubtle">
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
          backgroundColor="brandPrimary"
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={ColorPalette.textInverse} />
          ) : (
            <Plus size={14} color={ColorPalette.textInverse} />
          )}
          <Text variant="bodyXsMedium" color="textInverse">
            New Trip
          </Text>
        </Box>
      </Pressable>
    </Box>
  );
}
