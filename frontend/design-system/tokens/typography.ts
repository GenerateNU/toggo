export const FontSize = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 64,
} as const;

export const FontFamily = {
  light: "Figtree-Light",
  regular: "Figtree-Regular",
  medium: "Figtree-Medium",
  semiBold: "Figtree-SemiBold",
  bold: "Figtree-Bold",
  extraBold: "Figtree-ExtraBold",
  black: "Figtree-Black",
  logo: "Zain-ExtraBold",
} as const;

type FontSizeKey = keyof typeof FontSize;
type FontFamilyKey = keyof typeof FontFamily;

type TypographyConfig = {
  size: FontSizeKey;
  family: FontFamilyKey;
  lineHeightMultiplier?: number;
  letterSpacing?: number;
};

export type TypographyStyle = {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
};

const createTypography = ({
  size,
  family,
  lineHeightMultiplier,
  letterSpacing,
}: TypographyConfig): TypographyStyle => {
  const fontSize = FontSize[size];
  const fontFamily = FontFamily[family];
  const isLarge = fontSize >= 24;
  const resolvedLineHeight = lineHeightMultiplier ?? (isLarge ? 1.2 : 1.4);

  return {
    fontSize,
    fontFamily,
    lineHeight: Math.round(fontSize * resolvedLineHeight),
    letterSpacing: letterSpacing ?? (isLarge ? -0.5 : 0),
  };
};

export const Typography = {
  defaults: createTypography({ size: "md", family: "regular" }),

  // Headings
  headingXl: createTypography({ size: "xl", family: "semiBold" }),
  headingMd: createTypography({ size: "lg", family: "semiBold" }),
  headingSm: createTypography({ size: "md", family: "medium" }),

  // Body — default (regular), medium, strong (semibold)
  bodyDefault: createTypography({ size: "md", family: "regular" }),
  bodyMedium: createTypography({ size: "md", family: "medium" }),
  bodyStrong: createTypography({ size: "md", family: "semiBold" }),

  bodyLarge: createTypography({ size: "lg", family: "regular" }),
  bodyLargeStrong: createTypography({ size: "lg", family: "semiBold" }),

  bodySmDefault: createTypography({ size: "sm", family: "regular" }),
  bodySmMedium: createTypography({ size: "sm", family: "medium" }),
  bodySmStrong: createTypography({ size: "sm", family: "semiBold" }),

  bodyXsDefault: createTypography({ size: "xs", family: "regular" }),
  bodyXsMedium: createTypography({ size: "xs", family: "medium" }),
  bodyXsStrong: createTypography({ size: "xs", family: "semiBold" }),

  bodyXxsDefault: createTypography({ size: "xxs", family: "regular" }),
  bodyXxsMedium: createTypography({ size: "xxs", family: "medium" }),
  bodyXxsStrong: createTypography({ size: "xxs", family: "semiBold" }),

  // Logo (Zain ExtraBold)
  logoXl: createTypography({ size: "xl", family: "logo", letterSpacing: -1 }),
  logoXxl: createTypography({ size: "xxl", family: "logo", letterSpacing: -1 }),
  logoXxxl: createTypography({
    size: "xxxl",
    family: "logo",
    letterSpacing: -2,
  }),
} as const;

export type TypographyVariant = keyof typeof Typography;
