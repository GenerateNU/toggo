import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { useEffect, useMemo } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToggleProps = {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

const TRACK_WIDTH = 62;
const TRACK_HEIGHT = 29;
const THUMB_WIDTH = 35;
const THUMB_HEIGHT = 23;
const THUMB_OFFSET = 3;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_WIDTH - THUMB_OFFSET * 2;
const TRACK_OFF_COLOR = ColorPalette.borderDefault;
const TRACK_ON_COLOR = ColorPalette.statusSuccess;

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
          variant="bodySmMedium"
          color={disabled ? "textDisabled" : "textInverse"}
          style={{ flex: 1 }}
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
    top: THUMB_OFFSET,
    left: THUMB_OFFSET,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    backgroundColor: ColorPalette.backgroundCard,
    shadowColor: ColorPalette.backgroundDefault,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
