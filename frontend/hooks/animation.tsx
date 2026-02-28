import { useEffect, useMemo } from "react";
import { Animated } from "react-native";

const usePulsingAnimation = (
  initialValue: number = 1,
  duration: number = 1000,
) => {
  const opacity = useMemo(
    () => new Animated.Value(initialValue),
    [initialValue],
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: initialValue,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, duration, initialValue]);

  return opacity;
};

export default usePulsingAnimation;
