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
  25: "#FFF7F0",
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

export const ColorPalette = {
  transparent: "transparent",
  white: Gray[0],
  black: "#000000",

  gray25: Gray[25],
  gray50: Gray[50],
  gray100: Gray[100],
  gray200: Gray[200],
  gray300: Gray[300],
  gray400: Gray[400],
  gray500: Gray[500],
  gray600: Gray[600],
  gray700: Gray[700],
  gray800: Gray[800],
  gray900: Gray[900],
  gray950: Gray[950],

  brand50: Brand[50],
  brand100: Brand[100],
  brand200: Brand[200],
  brand300: Brand[300],
  brand400: Brand[400],
  brand500: Brand[500],
  brand600: Brand[600],
  brand700: Brand[700],
  brand800: Brand[800],
  brand900: Brand[900],
  brand950: Brand[950],

  blue25: Blue[25],
  blue50: Blue[50],
  blue100: Blue[100],
  blue200: Blue[200],
  blue300: Blue[300],
  blue400: Blue[400],
  blue500: Blue[500],
  blue600: Blue[600],
  blue700: Blue[700],
  blue800: Blue[800],
  blue900: Blue[900],
  blue950: Blue[950],

  // Home surface accents (Figma: upcoming sections)
  brandSecondarySubtle: Blue[25], // #F2F3FF
  backgroundOverlay: "rgba(0,0,0,0.4)",
  backgroundWarm: "#FFF3E8", // Figma warm surface

  statusSuccess: Green[500],
  statusError: Red[500],
  statusWarning: Amber[500],
  statusInfo: Blue[500],
  statusProgress: Teal[500],
} as const;

export type ColorName = keyof typeof ColorPalette;
