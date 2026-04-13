import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { Layout } from "@/design-system/tokens/layout";
import { Check } from "lucide-react-native";
import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityFeedItemProps = {
  isUnread: boolean;
  onMarkRead?: () => void;
  children: React.ReactNode;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const SWIPE_ICON_SIZE = 15;
const DISMISS_THRESHOLD = -160;
const SNAP_BACK_CONFIG = { duration: 250 };

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityFeedItem({
  isUnread,
  onMarkRead,
  children,
}: ActivityFeedItemProps) {
  const translateX = useSharedValue(0);

  const fireMarkRead = useCallback(() => {
    onMarkRead?.();
  }, [onMarkRead]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((e) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      if (translateX.value < DISMISS_THRESHOLD) {
        runOnJS(fireMarkRead)();
      } else {
        translateX.value = withTiming(0, SNAP_BACK_CONFIG);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const pillStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      Math.abs(translateX.value) / Math.abs(DISMISS_THRESHOLD),
    );
    return {
      backgroundColor: interpolateColor(
        progress,
        [0, 0.2, 0.6, 1],
        [
          ColorPalette.gray200,
          ColorPalette.gray300,
          ColorPalette.blue300,
          ColorPalette.blue500,
        ],
      ),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      Math.abs(translateX.value) / Math.abs(DISMISS_THRESHOLD),
    );
    return {
      color: interpolateColor(
        progress,
        [0, 0.2, 0.6, 1],
        [
          ColorPalette.gray500,
          ColorPalette.gray600,
          ColorPalette.white,
          ColorPalette.white,
        ],
      ),
    };
  });

  const grayIconOpacity = useAnimatedStyle(() => {
    const progress = Math.abs(translateX.value) / Math.abs(DISMISS_THRESHOLD);
    return { opacity: progress < 0.9 ? 1 : 0 };
  });

  const whiteIconOpacity = useAnimatedStyle(() => {
    const progress = Math.abs(translateX.value) / Math.abs(DISMISS_THRESHOLD);
    return { opacity: progress < 0.9 ? 0 : 1 };
  });

  if (!isUnread || !onMarkRead) {
    return (
      <Animated.View layout={LinearTransition.springify()}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify()}
    >
      <View style={styles.swipeRow}>
        <View style={styles.pillContainer}>
          <Animated.View style={[styles.swipeActionPill, pillStyle]}>
            <View style={styles.iconWrapper}>
              <Animated.View style={[styles.iconAbsolute, grayIconOpacity]}>
                <Check
                  size={SWIPE_ICON_SIZE}
                  color={ColorPalette.gray500}
                  strokeWidth={2.5}
                />
              </Animated.View>
              <Animated.View style={[styles.iconAbsolute, whiteIconOpacity]}>
                <Check
                  size={SWIPE_ICON_SIZE}
                  color={ColorPalette.white}
                  strokeWidth={2.5}
                />
              </Animated.View>
            </View>
            <Animated.Text style={[styles.swipeActionLabel, textStyle]}>
              Mark as read
            </Animated.Text>
          </Animated.View>
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.cardLayer, cardAnimatedStyle]}>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  swipeRow: {
    position: "relative",
  },
  pillContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: Layout.spacing.xs,
  },
  cardLayer: {
    backgroundColor: ColorPalette.gray50,
  },
  swipeActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    borderRadius: CornerRadius.full,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  swipeActionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: Math.round(FontSize.sm * 1.3),
  },
  iconWrapper: {
    width: SWIPE_ICON_SIZE,
    height: SWIPE_ICON_SIZE,
  },
  iconAbsolute: {
    position: "absolute" as const,
    top: 0,
    left: 0,
  },
});
