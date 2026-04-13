export const CornerRadius = {
  none: 0,
  xs: 4, // tags, pills (small)
  sm: 8, // buttons, small nested components
  md: 12, // cards, snackbars, banners (default)
  lg: 16, // sheets, dialogs, large containers
  xl: 20, // large nested components
  xxl: 24,
  xxxl: 30,
  full: 9999, // fully rounded (chips, avatars)
} as const;

export type CornerRadiusKey = keyof typeof CornerRadius;
