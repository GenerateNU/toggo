const FONT_SIZES = {
  xsmall: 12,
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 24,
  xxlarge: 32,
};

const FONT_FAMILIES = {
  regular: "Regular",
  bold: "Bold",
};

export const FontVariants = {
  defaults: {
    fontSize: FONT_SIZES.medium,
    fontFamily: FONT_FAMILIES.regular,
  },
  h1: {
    fontSize: FONT_SIZES.xxlarge,
    fontFamily: FONT_FAMILIES.bold,
  },
  h2: {
    fontSize: FONT_SIZES.xlarge,
    fontFamily: FONT_FAMILIES.bold,
  },
  bodyLarge: {
    fontSize: FONT_SIZES.large,
    fontFamily: FONT_FAMILIES.regular,
  },
  bodyLargeBold: {
    fontSize: FONT_SIZES.large,
    fontFamily: FONT_FAMILIES.bold,
  },
  body: {
    fontSize: FONT_SIZES.medium,
    fontFamily: FONT_FAMILIES.regular,
  },
  bodyBold: {
    fontSize: FONT_SIZES.medium,
    fontFamily: FONT_FAMILIES.bold,
  },
  button: {
    fontSize: FONT_SIZES.large,
    fontFamily: FONT_FAMILIES.regular,
  },
  caption: {
    fontSize: FONT_SIZES.small,
    fontFamily: FONT_FAMILIES.regular,
  },
  captionBold: {
    fontSize: FONT_SIZES.small,
    fontFamily: FONT_FAMILIES.bold,
  },
  navbar: {
    fontSize: FONT_SIZES.xsmall,
    fontFamily: FONT_FAMILIES.regular,
  },
};

export type FontVariant = keyof typeof FontVariants;
