import { ColorName } from "../config/color";

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
  borderColor: "oceanBlue",
};

const createButtonStyle = (
  color: ColorName,
  borderRadius: string | undefined = undefined,
  outline?: boolean,
) => ({
  ...baseButton,
  width: "100%",
  backgroundColor: outline ? "transparent" : color, // Use color key, not ColorPalette[color]
  borderRadius,
  borderWidth: outline ? 2 : 0,
  borderColor: outline ? color : "transparent",
  color: outline ? color : "cloudWhite",
});

export const ButtonVariants = {
  defaults: createButtonStyle("forestGreen", "full"),
  icon: {
    ...baseIcon,
    backgroundColor: "cloudWhite",
  },
  iconGray: {
    ...baseIcon,
    backgroundColor: "mountainGray",
  },
  iconBeige: {
    ...baseIcon,
    backgroundColor: "sandyBeige",
  },
  smallIconBorder: {
    ...baseIconBorder,
    backgroundColor: "cloudWhite",
    borderColor: "forestGreen",
  },
  text: {
    width: "auto",
  },
  primary: createButtonStyle("sunsetOrange", "full"),
  secondary: createButtonStyle("forestGreen", "full"),
  accent: createButtonStyle("skyBlue", "full"),
};

export type ButtonVariant = keyof typeof ButtonVariants;
