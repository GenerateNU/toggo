import { BorderWidth, BorderWidthKey } from "@/design-system/tokens/border";
import { ColorName, ColorPalette } from "@/design-system/tokens/color";
import {
  CornerRadius,
  CornerRadiusKey,
} from "@/design-system/tokens/corner-radius";
import { Layout, LayoutSpacingKey } from "@/design-system/tokens/layout";

export type ButtonSize = "small" | "medium" | "large";

export const ButtonSizes: Record<
  ButtonSize,
  {
    containerHeight: number;
    minHeightToken?: LayoutSpacingKey;
    iconSize: number;
    fontSize: number;
    lineHeight: number;
    paddingHorizontalToken: LayoutSpacingKey;
  }
> = {
  small: {
    containerHeight: 36,
    iconSize: 16,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontalToken: "sm",
  },
  medium: {
    containerHeight: 48,
    minHeightToken: "xl",
    iconSize: 20,
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontalToken: "md",
  },
  large: {
    containerHeight: 56,
    iconSize: 24,
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontalToken: "lg",
  },
};

type LayoutWidth = "100%" | "auto";

interface ButtonVariantStyle {
  alignItems: "center";
  justifyContent: "center";
  minHeight: LayoutSpacingKey;
  paddingHorizontal: LayoutSpacingKey;
  width: LayoutWidth;
  backgroundColor: ColorName;
  borderRadius: CornerRadiusKey;
  borderWidth: BorderWidthKey;
  borderColor?: ColorName;
  contentColor: ColorName;
}

const baseButton = {
  alignItems: "center",
  justifyContent: "center",
  minHeight: "xl",
  paddingHorizontal: "md",
} as const;

export const ButtonVariants = {
  Primary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "brand500",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "white",
  },
  Secondary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "gray50",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "gray900",
  },
  Tertiary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "gray900",
  },
  Quaternary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "gray500",
  },
  Destructive: {
    ...baseButton,
    width: "100%",
    backgroundColor: "statusError",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "white",
  },
  IconPrimary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "xl",
    paddingHorizontal: "md",
    width: "auto",
    backgroundColor: "brand500",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "white",
  },
  IconSecondary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "xl",
    paddingHorizontal: "md",
    width: "auto",
    backgroundColor: "gray50",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "gray900",
  },
  IconTertiary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "xl",
    paddingHorizontal: "md",
    width: "auto",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "gray500",
  },
  Blue: {
    ...baseButton,
    width: "100%",
    backgroundColor: "blue25",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "blue500",
  },
  Red: {
    ...baseButton,
    width: "100%",
    contentColor: "statusError",
    backgroundColor: "gray50",
    borderRadius: "lg",
    borderWidth: "none",
  },
  Outline: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "thin",
    borderColor: "gray300",
    contentColor: "gray900",
  },
  Dashed: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "thin",
    borderColor: "gray300",
    contentColor: "gray500",
  },
  IconCircular: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "md",
    paddingHorizontal: "sm",
    width: "auto",
    backgroundColor: "gray900",
    borderRadius: "full",
    borderWidth: "none",
    contentColor: "white",
  },
} as const satisfies Record<string, ButtonVariantStyle>;

export type ButtonVariant = keyof typeof ButtonVariants;

export const DisabledVariantStyle: Record<
  ButtonVariant,
  {
    backgroundColor: ColorName;
    contentColor: ColorName;
  }
> = {
  Primary: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
  Secondary: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
  Tertiary: { backgroundColor: "transparent", contentColor: "gray400" },
  Quaternary: { backgroundColor: "transparent", contentColor: "gray400" },
  Destructive: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
  IconPrimary: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
  IconSecondary: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
  IconTertiary: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
  Blue: {
    backgroundColor: "gray100",
    contentColor: "gray400",
  },
  Red: {
    backgroundColor: "gray100",
    contentColor: "gray400",
  },
  Outline: {
    backgroundColor: "transparent",
    contentColor: "gray400",
  },
  Dashed: {
    backgroundColor: "transparent",
    contentColor: "gray400",
  },
  IconCircular: {
    backgroundColor: "gray300",
    contentColor: "gray400",
  },
};

export function resolveButtonStyle(
  variant: ButtonVariant,
  size: ButtonSize = "medium",
  disabled = false,
) {
  const v = ButtonVariants[variant] as ButtonVariantStyle;
  const s = ButtonSizes[size];
  const d = disabled ? DisabledVariantStyle[variant] : undefined;

  return {
    alignItems: v.alignItems,
    justifyContent: v.justifyContent,
    width: v.width,
    backgroundColor: d?.backgroundColor ?? v.backgroundColor,
    borderRadius: CornerRadius[v.borderRadius],
    borderWidth: v.borderWidth === "none" ? 0 : BorderWidth[v.borderWidth],
    ...(v.borderColor ? { borderColor: v.borderColor } : {}),
    contentColor: d?.contentColor ?? v.contentColor,
    minHeight: s.minHeightToken
      ? Layout.spacing[s.minHeightToken]
      : s.containerHeight,
    paddingHorizontal:
      variant === "IconPrimary" ||
      variant === "IconSecondary" ||
      variant === "IconTertiary"
        ? 0
        : Layout.spacing[s.paddingHorizontalToken],
    iconSize: s.iconSize,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
  };
}

export function getButtonTextColor(background: ColorName): ColorName {
  const hex = ColorPalette[background]?.replace("#", "");
  if (!hex || hex.length < 6) return "white";

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? "gray900" : "white";
}
