import { Box, Chip, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { Calendar, MapPin, Settings } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const SKELETON_WIDTH = 160;
const SKELETON_HEIGHT = 28;
const TITLE_MAX_WIDTH = "65%";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripMetadataProps = {
  tripName?: string;
  tripDate: string | null;
  tripLocation?: string;
  isLoading: boolean;
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
  onInviteFriends,
  onSettingsPress,
  onDatePress,
  onLocationPress,
}: TripMetadataProps) {
  return (
    <Box gap="sm" paddingHorizontal="sm" paddingTop="sm">
      <Box
        flexDirection="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap="md"
      >
        {isLoading ? (
          <Box
            width={SKELETON_WIDTH}
            height={SKELETON_HEIGHT}
            backgroundColor="gray100"
            borderRadius="xs"
          />
        ) : (
          <Box flex={1} style={{ maxWidth: TITLE_MAX_WIDTH }}>
            <Text variant="headingXl" color="gray950">
              {tripName ?? "Trip"}
            </Text>
          </Box>
        )}

        <Box flexDirection="row" alignItems="center" gap="sm" flexShrink={0}>
          <Chip label="+ Invite Friends" onPress={onInviteFriends} />
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
  hitSlop: {
    top: Layout.spacing.xs,
    bottom: Layout.spacing.xs,
    left: Layout.spacing.xs,
    right: Layout.spacing.xs,
  },
});

export default TripMetadata;
