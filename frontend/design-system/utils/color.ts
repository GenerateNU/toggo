/**
 * Color Utilities
 *
 * Helper functions for color manipulation and conversion.
 */

/**
 * Converts a hex color to rgba format with specified opacity
 *
 * @param hexColor - Hex color string (with or without #)
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string
 *
 * @example
 * withOpacity("#FF7E00", 0.12) → "rgba(255, 126, 0, 0.12)"
 * withOpacity("FF7E00", 0.5) → "rgba(255, 126, 0, 0.5)"
 */
export function withOpacity(hexColor: string, opacity: number): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Clamp opacity between 0 and 1
  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  return `rgba(${r}, ${g}, ${b}, ${clampedOpacity})`;
}
