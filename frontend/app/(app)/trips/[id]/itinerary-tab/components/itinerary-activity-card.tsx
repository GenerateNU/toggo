import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { MapPin } from "lucide-react-native";
import React, { useCallback } from "react";
import { Image, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LONG_PRESS_DURATION_MS, THUMBNAIL_SIZE } from "../constants";
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
  const thumbnailUrl = activity.thumbnail_url ?? activity.media_url;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handleDragStart = useCallback(() => {
    onDragStart?.(activity.id ?? "");
  }, [onDragStart, activity.id]);

  const handleDragMove = useCallback(
    (absX: number, absY: number) => {
      onDragMove?.(absX, absY);
    },
    [onDragMove],
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const handleTap = useCallback(() => {
    onPress();
  }, [onPress]);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DURATION_MS)
    .onBegin(() => {
      isDragging.value = true;
      translateX.value = 0;
      translateY.value = 0;
      runOnJS(handleDragStart)();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      runOnJS(handleDragEnd)();
      isDragging.value = false;
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleTap)();
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: isDragging.value ? translateX.value : 0 },
      {
        translateY: isDragging.value
          ? translateY.value + (dragScrollCompensationY?.value ?? 0)
          : 0,
      },
      {
        scale: withSpring(isDragging.value ? 1.05 : 1, {
          damping: 20,
          stiffness: 300,
        }),
      },
    ],
    shadowOpacity: isDragging.value ? 0.2 : 0,
    shadowRadius: isDragging.value ? 12 : 0,
    shadowOffset: { width: 0, height: isDragging.value ? 6 : 0 },
    elevation: isDragging.value ? 8 : 0,
    zIndex: isDragging.value ? 100 : 0,
    opacity: isDragging.value ? 0.7 : 1,
  }));

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
    padding: Layout.spacing.sm,
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
