import { createTheme } from "@shopify/restyle";
import { ColorPalette } from "./color";
import { Spacing } from "./spacing";
import { BorderRadius } from "./border-radius";
import { AvatarVariants } from "../variants/avatar";
import { ButtonVariants } from "../variants/button";
import { FontVariants } from "./text";

const getTheme = () => {
  const theme = createTheme({   
    colors: ColorPalette,
    spacing: Spacing,
    borderRadii: BorderRadius,
    avatarVariants: AvatarVariants,
    buttonVariants: ButtonVariants,
    textVariants: FontVariants,
    iconSize: 30,
  });
  return theme;
};

type Theme = ReturnType<typeof getTheme>;

export { getTheme, Theme };