export const BorderWidth = {
  hairline: 0.5, // subtle separators (retina optimized)
  thin: 1, // default border
  medium: 2, // emphasis
  thick: 4, // strong highlight
  none: 0,
} as const;

export type BorderWidthKey = keyof typeof BorderWidth;
