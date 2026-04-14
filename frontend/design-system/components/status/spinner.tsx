import { ColorPalette, type ColorName } from "../../tokens/color";
import { LoaderCircle } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

type SpinnerProps = {
  size?: number;
  color?: ColorName;
};

export default function Spinner({
  size = 28,
  color = "brand500",
}: SpinnerProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <LoaderCircle size={size} color={ColorPalette[color]} />
    </Animated.View>
  );
}
