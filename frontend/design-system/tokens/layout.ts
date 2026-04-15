export const Layout = {
  grid: {
    base: 8,
  },

  spacing: {
    xxs: 4,
    xs: 8,
    sm: 16,
    lx: 20,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
  },

  screen: {
    horizontalPadding: 24,
    compactPadding: 16,
  },

  section: {
    sm: 24,
    md: 32,
    lg: 48,
  },

  content: {
    maxReadableWidth: 680,
  },
} as const;

/**
 * Standard handle for bottom sheet modals
 * Used to indicate draggable sheet UI
 */
export const ModalHandle = {
  width: 38,
  height: 4,
  borderRadius: 2,
  marginBottom: 12,
} as const;

export type LayoutKey = keyof typeof Layout;
export type LayoutGridKey = keyof typeof Layout.grid;
export type LayoutSpacingKey = keyof typeof Layout.spacing;
export type LayoutScreenKey = keyof typeof Layout.screen;
export type LayoutSectionKey = keyof typeof Layout.section;
export type LayoutContentKey = keyof typeof Layout.content;
