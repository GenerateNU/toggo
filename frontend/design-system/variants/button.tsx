import { ColorName, ColorPalette } from "../config/color";

const baseButton = {
  padding: "s",
  alignItems: "center",
  justifyContent: "center",
};

const baseIcon = {
  width: "auto",
  padding: "s",
  borderRadius: "full",
  aspectRatio: 1,
};

const baseIconBorder = {
  width: "auto",
  borderRadius: "full",
  aspectRatio: 1,
  borderWidth: 2,
  borderColor: ColorPalette.oceanBlue,
};

const createButtonStyle = (
  color: ColorName,
  borderRadius: string | undefined = undefined,
  outline?: boolean,
) => ({
  ...baseButton,
  width: "100%",
  backgroundColor: outline ? "transparent" : ColorPalette[color],
  borderRadius,
  borderWidth: outline ? 2 : 0,
  borderColor: outline ? ColorPalette[color] : "transparent",
  color: outline ? ColorPalette[color] : ColorPalette.cloudWhite,
});

export const ButtonVariants = {
  icon: {
    ...baseIcon,
    backgroundColor: ColorPalette.cloudWhite,
  },
  iconGray: {
    ...baseIcon,
    backgroundColor: ColorPalette.mountainGray,
  },
  iconBeige: {
    ...baseIcon,
    backgroundColor: ColorPalette.sandyBeige,
  },
  smallIconBorder: {
    ...baseIconBorder,
    backgroundColor: ColorPalette.cloudWhite,
    borderColor: ColorPalette.forestGreen,
  },
  text: {
    width: "auto",
  },
  primary: createButtonStyle("sunsetOrange", "full"),
  secondary: createButtonStyle("forestGreen", "full", true),
  accent: createButtonStyle("skyBlue", "full"),
};

export type ButtonVariant = keyof typeof ButtonVariants;
