export const Gray = {
  0: "#FFFFFF",
  25: "#F9F9F9",
  50: "#F2F2F2",
  100: "#E6E6E6",
  200: "#CCCCCC",
  300: "#B3B3B3",
  400: "#999999",
  500: "#808080",
  600: "#666666",
  700: "#4D4D4D",
  800: "#333333",
  900: "#1A1A1A",
  950: "#121212",
} as const;

export const Brand = {
  50: "#FFF2E5",
  100: "#FFE6CC",
  200: "#FFCC99",
  300: "#FFB366",
  400: "#FF9933",
  500: "#FF8000",
  600: "#CC6600",
  700: "#994C00",
  800: "#663300",
  900: "#331A00",
  950: "#241200",
} as const;

export const Blue = {
  25: "#F2F3FF",
  50: "#E5EEFF",
  100: "#CCDDFF",
  200: "#99BBFF",
  300: "#6699FF",
  400: "#3377FF",
  500: "#0055FF",
  600: "#0044CC",
  700: "#003399",
  800: "#002266",
  900: "#001133",
  950: "#000C24",
} as const;

const Green = {
  500: "#34C759",
} as const;

const Red = {
  500: "#D80009",
} as const;

const Amber = {
  500: "#FF9500",
} as const;

const Teal = {
  500: "#4ECBA0",
} as const;

// ─── Semantic Color Tokens ─────────────────────────────────────────────────
// Use these throughout the app. Names describe role, not the color value.

export const ColorPalette = {
  transparent: "transparent",

  // Brand
  brandPrimary: Brand[500],
  brandPrimarySubtle: Brand[50],
  brandSecondary: Blue[500],
  brandSecondarySubtle: Blue[50],

  // Text
  textDefault: Gray[0],
  textSubtle: Gray[500],
  textDisabled: Gray[400],
  textInverse: Gray[900],
  textLink: Blue[500],
  textBrand: Brand[500],
  textError: Red[500],

  // Icon
  iconDefault: Gray[0],
  iconSubtle: Gray[500],
  iconDisabled: Gray[400],
  iconInverse: Gray[900],

  // Background
  backgroundDefault: Gray[900],
  backgroundSubtle: Gray[50],
  backgroundCard: Gray[0],
  backgroundMuted: Gray[200],
  backgroundElevated: Gray[50],
  backgroundDisabled: Gray[300],
  backgroundOverlay: "rgba(0,0,0,0.4)",
  backgroundIconDefault: Gray[900],
  backgroundIconSubtle: Gray[50],
  backgroundWarm: "#FFF3E8",

  // Border
  borderDefault: Gray[300],
  borderSubtle: Gray[100],

  // Status
  statusSuccess: Green[500],
  statusError: Red[500],
  statusWarning: Amber[500],
  statusInfo: Blue[500],
  statusProgress: Teal[500],
} as const;

export type ColorName = keyof typeof ColorPalette;
