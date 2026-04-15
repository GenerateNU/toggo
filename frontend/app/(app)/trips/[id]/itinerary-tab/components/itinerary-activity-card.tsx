import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import { getActivityThumbnailUrl } from "@/utils/activity-helpers";
import { GripVertical, ImageIcon, MapPin } from "lucide-react-native";
import { Image } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { THUMBNAIL_SIZE } from "../constants";
import { useActivityCardGestures } from "../hooks/useActivityCardGestures";
import type { ItineraryActivityCardProps } from "../types";
import { formatPrice } from "../utils";

// ─── Tag ─────────────────────────────────────────────────────────────────────

function Tag({
  icon,
  label,
  truncate = false,
}: {
  icon?: React.ReactNode;
  label: string;
  truncate?: boolean;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      flexShrink={truncate ? 1 : 0}
      minWidth={truncate ? 0 : undefined}
      gap="xxs"
      backgroundColor="gray50"
      borderRadius="sm"
      paddingHorizontal="xs"
      paddingVertical="xxs"
    >
      {icon}
      <Text
        variant="bodySmMedium"
        numberOfLines={1}
        style={truncate ? { flexShrink: 1 } : undefined}
      >
        {label}
      </Text>
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryActivityCard({
  activity,
  onPress,
  draggable = true,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragScrollCompensationY,
}: ItineraryActivityCardProps) {
  const priceLabel = formatPrice(activity.estimated_price);
  const thumbnailUrl = getActivityThumbnailUrl(activity);

  const { composedGesture, animatedStyle } = useActivityCardGestures({
    activityId: activity.id ?? "",
    draggable,
    onPress,
    onDragStart,
    onDragMove,
    onDragEnd,
    dragScrollCompensationY,
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[containerStyle, animatedStyle]}
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
              style={thumbnailStyle}
              resizeMode="cover"
            />
          ) : (
            <Box flex={1} alignItems="center" justifyContent="center">
              <ImageIcon size={24} color={ColorPalette.gray300} />
            </Box>
          )}
        </Box>

        <Box flex={1} gap="xxs">
          <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
            {activity.name ?? "Unnamed Activity"}
          </Text>

          <Box flexDirection="row" alignItems="center" gap="xxs">
            <Tag label={priceLabel ?? "Free"} />

            {activity.location_name && (
              <Tag
                icon={<MapPin size={12} color={ColorPalette.gray500} />}
                label={activity.location_name}
                truncate
              />
            )}
          </Box>

          {activity.description && (
            <Text variant="bodyXsDefault" color="gray400" numberOfLines={1}>
              {activity.description}
            </Text>
          )}
        </Box>

        {draggable && <GripVertical size={16} color={ColorPalette.gray500} />}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: Layout.spacing.xs,
  padding: Layout.spacing.xs,
  backgroundColor: ColorPalette.white,
  borderRadius: CornerRadius.lg,
  ...Elevation.sm,
};

const thumbnailStyle = {
  width: THUMBNAIL_SIZE,
  height: THUMBNAIL_SIZE,
};

export default ItineraryActivityCard;
