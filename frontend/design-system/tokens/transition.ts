export const Easing = {
  fast: "ease-out", // snappy
  standard: "ease-in-out", // default smooth
  slow: "ease-in-out", // slow animations
} as const;

export type EasingKey = keyof typeof Easing;

export const Transition = {
  xs: {
    duration: 100,
    easing: Easing.fast,
  },
  sm: {
    duration: 200,
    easing: Easing.standard,
  },
  md: {
    duration: 300,
    easing: Easing.standard,
  },
  lg: {
    duration: 500,
    easing: Easing.standard,
  },
  xl: {
    duration: 700,
    easing: Easing.slow,
  },
} as const;

export type TransitionKey = keyof typeof Transition;
