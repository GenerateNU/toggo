import { useEffect } from "react";
import {
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Creates a shimmer animation that moves from left to right using Reanimated
 * Returns a shared value that can be used to translate the shimmer gradient
 */
const useShimmerAnimation = (duration: number = 1500) => {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration }),
      -1, // infinite repeat
      false, // don't reverse
    );
  }, [translateX, duration]);

  return translateX;
};

export default useShimmerAnimation;
