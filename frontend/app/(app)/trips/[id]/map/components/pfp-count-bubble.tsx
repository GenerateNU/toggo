import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { CoreSize } from "@/design-system/tokens/core-size";
import { FontFamily } from "@/design-system/tokens/typography";
import { StyleSheet, View, Text } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type PfpCountBubbleProps = {
  count: number;
  /**
   * "xs" matches 16px (xs) avatars — Figma shadow 0 0 2.667, text 6.67px
   * "sm" matches 24px (sm) avatars — Figma shadow 0 0 4, text 10px
   */
  variant: "xs" | "sm";
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PfpCountBubble({ count, variant }: PfpCountBubbleProps) {
  return (
    <View style={variant === "xs" ? styles.bubbleXs : styles.bubbleSm}>
      <Text style={variant === "xs" ? styles.textXs : styles.textSm}>
        +{count}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const bubbleBase = {
  borderRadius: CornerRadius.full,
  backgroundColor: ColorPalette.white,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const textBase = {
  fontFamily: FontFamily.medium,
  color: ColorPalette.gray500,
};

const styles = StyleSheet.create({
  // Figma: 16×16, shadow 0 0 2.667 rgba(0,0,0,0.25)
  bubbleXs: {
    ...bubbleBase,
    width: CoreSize.xs,
    height: CoreSize.xs,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 2.667,
    elevation: 2,
  },
  // Figma: 24×24, shadow 0 0 4 rgba(0,0,0,0.25)
  bubbleSm: {
    ...bubbleBase,
    width: CoreSize.sm,
    height: CoreSize.sm,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  // Figma: Figtree Medium 6.67px ≈ 7px
  textXs: {
    ...textBase,
    fontSize: 7,
    lineHeight: 8,
  },
  // Figma: Figtree Medium 10px
  textSm: {
    ...textBase,
    fontSize: 10,
    lineHeight: 12,
  },
});
