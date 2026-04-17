import { Layout } from "@/design-system/tokens/layout";

/** Horizontal padding on trip sheet (`paddingHorizontal="sm"`) plus gap between columns. */
export function getMoodBoardColumnWidth(screenWidth: number): number {
  const horizontalInset = Layout.spacing.sm * 2;
  const gapBetweenColumns = Layout.spacing.sm;
  const contentWidth = screenWidth - horizontalInset;
  return (contentWidth - gapBetweenColumns) / 2;
}
