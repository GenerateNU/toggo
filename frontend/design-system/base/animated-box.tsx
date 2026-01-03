import { Animated } from "react-native";
import {
  createRestyleComponent,
  backgroundColor,
  layout,
  border,
  spacing,
  opacity,
} from "@shopify/restyle";
import { BoxProps } from "@/design-system/base/box";
import { ReactNode } from "react";
import { Theme } from "../config/theme";

export type AnimationProps = BoxProps & {
  children?: ReactNode;
  entering?: unknown;
  style?: any;
};

export const AnimatedBox = createRestyleComponent<AnimationProps, Theme>(
  [backgroundColor, layout, border, spacing, opacity],
  Animated.View,
);