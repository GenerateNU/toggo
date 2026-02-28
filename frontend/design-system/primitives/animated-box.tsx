import { BoxProps } from "@/design-system/primitives/box";
import {
  backgroundColor,
  border,
  createRestyleComponent,
  layout,
  opacity,
  spacing,
} from "@shopify/restyle";
import { ReactNode } from "react";
import { Animated } from "react-native";
import { Theme } from "../tokens/theme";

export type AnimationProps = BoxProps & {
  children?: ReactNode;
  entering?: unknown;
  style?: any;
};

export const AnimatedBox = createRestyleComponent<AnimationProps, Theme>(
  [backgroundColor, layout, border, spacing, opacity],
  Animated.View,
);
