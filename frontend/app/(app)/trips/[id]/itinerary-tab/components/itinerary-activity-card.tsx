import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { GripVertical, MapPin } from "lucide-react-native";
import { Image, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { getActivityThumbnailUrl } from "@/utils/activity-helpers";
import { THUMBNAIL_SIZE } from "../constants";
import { useActivityCardGestures } from "../hooks/useActivityCardGestures";
import type { ItineraryActivityCardProps } from "../types";
import { formatPrice } from "../utils";

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryActivityCard({
  activity,
  onPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragScrollCompensationY,
}: ItineraryActivityCardProps) {
  const priceLabel = formatPrice(activity.estimated_price);
  const thumbnailUrl = getActivityThumbnailUrl(activity);

  const { composedGesture, animatedStyle } = useActivityCardGestures({
    activityId: activity.id ?? "",
    onPress,
    onDragStart,
    onDragMove,
    onDragEnd,
    dragScrollCompensationY,
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[styles.container, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={activity.name ?? "Activity"}
      >
        <Box
          width={THUMBNAIL_SIZE}
          height={THUMBNAIL_SIZE}
          borderRadius="md"
          overflow="hidden"
          backgroundColor="gray100"
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : null}
        </Box>

        <Box flex={1} gap="xxs">
          <Text variant="bodySmMedium" color="gray950" numberOfLines={1}>
            {activity.name ?? "Unnamed Activity"}
          </Text>

          <Box
            flexDirection="row"
            alignItems="center"
            gap="xs"
            flexWrap="wrap"
          >
            {priceLabel && (
              <Box
                backgroundColor="gray100"
                borderRadius="xs"
                paddingHorizontal="xs"
                paddingVertical="xxs"
              >
                <Text variant="bodyXxsMedium" color="gray700">
                  {priceLabel}
                </Text>
              </Box>
            )}

            {activity.location_name && (
              <Box flexDirection="row" alignItems="center" gap="xxs">
                <MapPin size={12} color={ColorPalette.gray500} />
                <Text
                  variant="bodyXxsDefault"
                  color="gray500"
                  numberOfLines={1}
                >
                  {activity.location_name}
                </Text>
              </Box>
            )}
          </Box>

          {activity.description && (
            <Text variant="bodyXxsDefault" color="gray400" numberOfLines={1}>
              {activity.description}
            </Text>
          )}
        </Box>

        <GripVertical size={16} color={ColorPalette.gray300} />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    padding: Layout.spacing.xs,
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.xl,
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
    shadowColor: "#000",
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
});

export default ItineraryActivityCard;
