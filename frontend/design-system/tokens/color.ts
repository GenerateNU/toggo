export const ColorPalette = {
  black: "#000000",
  white: "#FFFFFF",
  transparent: "transparent",

  // Branding
  brandPrimary: "#FF7E00",
  brandSecondary: "#34C759",
  brandAccent: "#FFB347",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#000000",
  textQuaternary: "#858585",
  textPrimaryDisable: "#A4A4A4",
  textSecondaryDisable: "#DEDEDE",
  textInverse: "#FFFFFF",
  textDisabled: "#BDBDBD",
  textLink: "#007AFF",

  // Icon
  iconPrimary: "#ffffff",
  iconSecondary: "#000000",
  iconTertiary: "#7E7E7E",

  // Surface
  surfaceBackground: "#F5F5F7",
  surfaceCard: "#FFFFFF",
  surfaceElevated: "#FAFAFA",
  surfaceOverlay: "rgba(0,0,0,0.4)",

  // Background
  primaryBackground: "#000000",
  secondaryBackground: "#ECECEC",
  disabledBackground: "#CECECE",
  iconPrimaryBackground: "#000000",
  iconSecondaryBackground: "#F6F6F6",

  // Borders
  borderPrimary: "#D6D6D6",
  borderSecondary: "#F0F0F0",

  // Feedback / Status
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",
  info: "#007AFF",
  progressFill: "#4ECBA0",
} as const;

export type ColorName = keyof typeof ColorPalette;
