import { Box, Chip, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { Calendar, MapPin, Settings } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripMetadataProps = {
  tripName?: string;
  tripDate: string | null;
  tripLocation?: string;
  isLoading: boolean;
  isInvitePending: boolean;
  onInviteFriends: () => void;
  onSettingsPress: () => void;
  onDatePress: () => void;
  onLocationPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripMetadata({
  tripName,
  tripDate,
  tripLocation,
  isLoading,
  isInvitePending,
  onInviteFriends,
  onSettingsPress,
  onDatePress,
  onLocationPress,
}: TripMetadataProps) {
  return (
    <Box gap="sm" paddingHorizontal="sm" paddingTop="sm">
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        {isLoading ? (
          <Box
            width={160}
            height={28}
            backgroundColor="gray100"
            borderRadius="xs"
          />
        ) : (
          <Text variant="headingXl" color="gray950">
            {tripName ?? "Trip"}
          </Text>
        )}

        <Box flexDirection="row" alignItems="center" gap="sm">
          {isInvitePending ? (
            <ActivityIndicator size="small" color={ColorPalette.gray500} />
          ) : (
            <Chip label="+ Invite Friends" onPress={onInviteFriends} />
          )}
          <Pressable
            onPress={onSettingsPress}
            hitSlop={styles.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Trip settings"
          >
            <Settings size={20} color={ColorPalette.gray950} />
          </Pressable>
        </Box>
      </Box>

      <Box gap="xs">
        <Pressable
          onPress={onDatePress}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Set trip dates"
        >
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Calendar size={16} color={ColorPalette.gray500} />
            <Text variant="bodySmDefault" color="gray500">
              {tripDate ?? "Add dates"}
            </Text>
          </Box>
        </Pressable>
        <Pressable
          onPress={onLocationPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Set trip location"
        >
          <Box flexDirection="row" alignItems="center" gap="xs">
            <MapPin size={16} color={ColorPalette.gray500} />
            <Text variant="bodySmDefault" color="gray500">
              {tripLocation ?? "Add location"}
            </Text>
          </Box>
        </Pressable>
      </Box>
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hitSlop: { top: Layout.spacing.xs, bottom: Layout.spacing.xs, left: Layout.spacing.xs, right: Layout.spacing.xs },
});

export default TripMetadata;
