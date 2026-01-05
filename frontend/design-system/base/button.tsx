import {
  ColorProps,
  createRestyleComponent,
  createVariant,
  spacing,
  SpacingProps,
  VariantProps,
} from "@shopify/restyle";
import { TouchableOpacity } from "react-native";
import { Theme } from "../config/theme";

export const Button = createRestyleComponent<
  VariantProps<Theme, "buttonVariants"> &
    SpacingProps<Theme> &
    ColorProps<Theme> &
    React.ComponentProps<typeof TouchableOpacity>,
  Theme
>(
  [createVariant({ themeKey: "buttonVariants" }), spacing],
  ({ disabled, style, ...props }) => (
    <TouchableOpacity
      disabled={disabled}
      style={[style, disabled && { opacity: 0.5 }]}
      {...props}
    />
  ),
);
