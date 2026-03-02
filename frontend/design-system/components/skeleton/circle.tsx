import { CoreSizeKey } from "@/design-system/tokens/core-size";
import { StyleSheet, ViewStyle } from "react-native";
import SkeletonRect from "./rectangle";

type SkeletonVariant = "light" | "base" | "dark";

interface SkeletonCircleProps {
  size?: CoreSizeKey;
  variant?: SkeletonVariant;
  style?: ViewStyle;
}

const SkeletonCircle = ({
  size = "xl",
  variant = "base",
  style,
}: SkeletonCircleProps) => {
  return (
    <SkeletonRect
      size={size}
      variant={variant}
      borderRadius="full"
      style={StyleSheet.flatten([{ overflow: "hidden" }, style])}
    />
  );
};

export default SkeletonCircle;
