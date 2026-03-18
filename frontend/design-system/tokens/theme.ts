import { createTheme, useTheme as useRestyleTheme } from "@shopify/restyle";
import { AvatarColorVariants } from "../components/avatars/color-variant";
import { ButtonVariants } from "../components/buttons/variant";
import { BorderWidth } from "./border";
import { ColorPalette } from "./color";
import { CoreSize } from "./core-size";
import { CornerRadius } from "./corner-radius";
import { Elevation } from "./elevation";
import { Layout } from "./layout";
import { Transition } from "./transition";
import { Typography } from "./typography";

export const theme = createTheme({
  // Design Tokens
  colors: ColorPalette,
  spacing: Layout.spacing,
  coreSize: CoreSize,
  layout: Layout,
  borderRadii: CornerRadius,
  elevation: Elevation,
  transition: Transition,
  textVariants: Typography,
  borderWidth: BorderWidth,

  // Component Variants
  buttonVariants: ButtonVariants,
  avatarColorVariants: AvatarColorVariants,
});

export type Theme = typeof theme;

export const useTheme = () => useRestyleTheme<Theme>();
