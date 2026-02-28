export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 36,
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
  const isDisplay = fontSize >= 24;
  const resolvedLineHeight = lineHeightMultiplier ?? (isDisplay ? 1.2 : 1.4);

  return {
    fontSize,
    fontFamily,
    lineHeight: Math.round(fontSize * resolvedLineHeight),
    letterSpacing: letterSpacing ?? (isDisplay ? -0.5 : 0),
  };
};

export const Typography = {
  defaults: createTypography({ size: "md", family: "regular" }),

  // Display — use black/extraBold for maximum impact
  xxxlDisplay: createTypography({ size: "xxxl", family: "black" }),
  xxlDisplay: createTypography({ size: "xxl", family: "black" }),
  xlDisplay: createTypography({ size: "xl", family: "extraBold" }),
  lgDisplay: createTypography({ size: "lg", family: "extraBold" }),
  smDisplay: createTypography({ size: "sm", family: "extraBold" }),

  // Heading — semiBold/bold
  xxlHeading: createTypography({ size: "xxl", family: "bold" }),
  xlHeading: createTypography({ size: "xl", family: "bold" }),
  lgHeading: createTypography({ size: "lg", family: "bold" }),
  mdHeading: createTypography({ size: "md", family: "semiBold" }),
  smHeading: createTypography({ size: "sm", family: "semiBold" }),
  xsHeading: createTypography({ size: "xs", family: "semiBold" }),

  // Label — medium weight for UI labels
  lgLabel: createTypography({ size: "lg", family: "medium" }),
  mdLabel: createTypography({ size: "md", family: "medium" }),
  smLabel: createTypography({ size: "sm", family: "medium" }),
  xsLabel: createTypography({ size: "xs", family: "medium" }),

  // Paragraph — regular for body text
  lgParagraph: createTypography({ size: "lg", family: "regular" }),
  mdParagraph: createTypography({ size: "md", family: "regular" }),
  smParagraph: createTypography({ size: "sm", family: "regular" }),
  xsParagraph: createTypography({ size: "xs", family: "regular" }),

  // Logo
  logoXxl: createTypography({ size: "xxl", family: "logo", letterSpacing: -1 }),
  logoXxxxl: createTypography({
    size: "xxxl",
    family: "logo",
    letterSpacing: -1,
  }),
} as const;

export type TypographyVariant = keyof typeof Typography;
