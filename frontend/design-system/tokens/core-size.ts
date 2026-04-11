export const CoreSize = {
  iconSm: 20,
  xxs: 12,
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
  xxl: 56,
  xxxl: 64,
} as const;

export type CoreSizeKey = keyof typeof CoreSize;
