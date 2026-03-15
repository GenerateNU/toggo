import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { StyleSheet, View, ViewStyle } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DividerProps = {
  /** Horizontal or vertical orientation */
  orientation?: "horizontal" | "vertical";
  /** Thickness of the divider line */
  width?: number;
  /** Override the default color */
  color?: string;
  /** Additional style overrides */
  style?: ViewStyle;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Divider({
  orientation = "horizontal",
  width = StyleSheet.hairlineWidth,
  color = ColorPalette.borderPrimary,
  style,
}: DividerProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <View
      style={[
        isHorizontal ? styles.horizontal : styles.vertical,
        isHorizontal ? { height: width } : { width },
        { backgroundColor: color },
        style,
      ]}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  horizontal: {
    alignSelf: "stretch",
    marginVertical: Layout.spacing.sm,
  },
  vertical: {
    alignSelf: "stretch",
    marginHorizontal: Layout.spacing.sm,
  },
});
