import { useCallback, useMemo } from "react";
import { Animated } from "react-native";

type UsePressScaleOptions = {
  /** Scale value when pressed (default: 0.95) */
  pressedScale?: number;
  /** Whether the button is disabled (default: false) */
  isDisabled?: boolean;
};

/**
 * Shared hook for press-scale animation logic used in Button and Chip components.
 * Returns an animated value and press handlers for consistent scaling behavior.
 */
export function usePressScale({
  pressedScale = 0.95,
  isDisabled = false,
}: UsePressScaleOptions = {}) {
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    Animated.spring(scaleAnim, {
      toValue: pressedScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [isDisabled, scaleAnim, pressedScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return {
    scaleAnim,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
  };
}
