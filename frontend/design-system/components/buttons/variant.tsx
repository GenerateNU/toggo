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

// ─── Base ─────────────────────────────────────────────────────────────────────

const baseButton = {
  alignItems: "center",
  justifyContent: "center",
  minHeight: "xl",
  paddingHorizontal: "md",
} as const;

// ─── Variants ─────────────────────────────────────────────────────────────────

export const ButtonVariants = {
  Primary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "primaryBackground",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "textPrimary",
  },
  Secondary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "secondaryBackground",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "textSecondary",
  },
  Tertiary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "textSecondary",
  },
  Quaternary: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "textQuaternary",
  },
  Destructive: {
    ...baseButton,
    width: "100%",
    backgroundColor: "error",
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
    backgroundColor: "iconPrimaryBackground",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "textPrimary",
  },
  IconSecondary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "xl",
    paddingHorizontal: "md",
    width: "auto",
    backgroundColor: "iconSecondaryBackground",
    borderRadius: "lg",
    borderWidth: "none",
    contentColor: "textSecondary",
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
    contentColor: "iconTertiary",
  },
  Outline: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "thin",
    borderColor: "borderPrimary",
    contentColor: "textSecondary",
  },
  Dashed: {
    ...baseButton,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: "lg",
    borderWidth: "thin",
    borderColor: "borderPrimary",
    contentColor: "textQuaternary",
  },
  IconCircular: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "md",
    paddingHorizontal: "sm",
    width: "auto",
    backgroundColor: "iconPrimaryBackground",
    borderRadius: "full",
    borderWidth: "none",
    contentColor: "textPrimary",
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
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
  },
  Secondary: {
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
  },
  Tertiary: { backgroundColor: "transparent", contentColor: "textDisabled" },
  Quaternary: { backgroundColor: "transparent", contentColor: "textDisabled" },
  Destructive: {
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
  },
  IconPrimary: {
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
  },
  IconSecondary: {
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
  },
  IconTertiary: {
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
  },
  Outline: {
    backgroundColor: "transparent",
    contentColor: "textDisabled",
  },
  Dashed: {
    backgroundColor: "transparent",
    contentColor: "textDisabled",
  },
  IconCircular: {
    backgroundColor: "disabledBackground",
    contentColor: "textDisabled",
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
  if (!hex || hex.length < 6) return "textPrimary";

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? "textPrimary" : "white";
}
