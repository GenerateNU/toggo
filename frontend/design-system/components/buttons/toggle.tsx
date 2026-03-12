import { Text } from "@/design-system/primitives/text";
import { useEffect, useMemo } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "@/design-system/tokens/color";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToggleProps = {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 26;
const THUMB_OFFSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2;
const TRACK_OFF_COLOR = ColorPalette.borderPrimary;
const TRACK_ON_COLOR = "#34C759";

export default function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: ToggleProps) {
  // Separate animated values so the thumb can use the native driver

  // these eslinters have to be disabled for the animations to work
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const thumbAnim = useMemo(() => new Animated.Value(value ? 1 : 0), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colorAnim = useMemo(() => new Animated.Value(value ? 1 : 0), []);

  useEffect(() => {
    Animated.parallel([
      // Thumb position
      Animated.spring(thumbAnim, {
        toValue: value ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 140,
        mass: 0.8,
      }),
      // Track color
      Animated.timing(colorAnim, {
        toValue: value ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [colorAnim, thumbAnim, value]);

  const thumbTranslateX = thumbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, THUMB_TRAVEL],
  });

  const trackColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [TRACK_OFF_COLOR, TRACK_ON_COLOR],
  });

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled && styles.pressed,
      ]}
      disabled={disabled}
    >
      {label && (
        <Text
          variant="smLabel"
          style={{
            color: disabled
              ? ColorPalette.textDisabled
              : ColorPalette.textSecondary,
            flex: 1,
          }}
        >
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: trackColor },
          disabled && styles.trackDisabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX: thumbTranslateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: "center",
  },
  trackDisabled: {
    opacity: 0.5,
  },
  thumb: {
    position: "absolute",
    left: THUMB_OFFSET,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: ColorPalette.white,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});