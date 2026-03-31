import { AnimatedBox } from "@/design-system/primitives/animated-box";
import { CoreSize, CoreSizeKey } from "@/design-system/tokens/core-size";
import {
  CornerRadius,
  CornerRadiusKey,
} from "@/design-system/tokens/corner-radius";
import usePulsingAnimation from "@/hooks/animation";
import { ViewStyle } from "react-native";

export const SkeletonWidth = {
  quarter: "25%",
  half: "50%",
  threeQuarter: "75%",
  full: "100%",
} as const;

const SkeletonVariantOpacity = {
  light: 0.4,
  base: 0.7,
  dark: 1,
} as const;

type SkeletonVariant = keyof typeof SkeletonVariantOpacity;
type SkeletonWidthKey = keyof typeof SkeletonWidth;

type SquareMode = {
  size: CoreSizeKey;
  borderRadius?: CornerRadiusKey;
  width?: never;
  height?: never;
};

type RectMode = {
  size?: never;
  borderRadius?: CornerRadiusKey;
  width?: SkeletonWidthKey;
  height?: CoreSizeKey;
};

type SkeletonRectProps = (SquareMode | RectMode) & {
  variant?: SkeletonVariant;
  style?: ViewStyle;
};

const getAutoRadius = (height: number): CornerRadiusKey => {
  if (height <= CoreSize.xs) return "xs";
  if (height <= CoreSize.md) return "sm";
  if (height <= CoreSize.lg) return "md";
  return "lg";
};

const SkeletonRect = ({
  size,
  borderRadius,
  variant = "base",
  width = "full",
  height = "xs",
  style,
}: SkeletonRectProps) => {
  const opacity = usePulsingAnimation(SkeletonVariantOpacity[variant]);

  const resolvedSize = size ? CoreSize[size] : undefined;
  const resolvedHeight = resolvedSize ?? CoreSize[height];
  const resolvedWidth = resolvedSize ?? SkeletonWidth[width];

  const defaultRadius = resolvedSize ? "sm" : getAutoRadius(resolvedHeight);
  const resolvedRadius = CornerRadius[borderRadius ?? defaultRadius];

  return (
    <AnimatedBox
      style={[
        {
          width: resolvedWidth,
          height: resolvedHeight,
          borderRadius: resolvedRadius,
          overflow: "hidden",
          opacity,
        },
        style,
      ]}
      backgroundColor="backgroundMuted"
    />
  );
};

export default SkeletonRect;
