import { BorderWidth } from "@/design-system/tokens/border";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

// ─── Glass Effect Tokens ────────────────────────────────────────────────────

const GLASS_BG = "rgba(206, 224, 238, 0.42)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.9)";
const GLASS_GRADIENT = [
  "rgba(246, 249, 252, 0.92)",
  "rgba(194, 220, 238, 0.62)",
  "rgba(186, 212, 230, 0.5)",
  "rgba(238, 236, 213, 0.3)",
  "rgba(170, 194, 214, 0.48)",
] as const;
const GLASS_GRADIENT_STOPS = [0, 0.28, 0.62, 0.76, 1] as const;
const SHINE_GRADIENT = [
  "rgba(255, 255, 255, 0.86)",
  "rgba(255, 255, 255, 0.04)",
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

type GlassContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function GlassContainer({
  children,
  style,
}: GlassContainerProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[...GLASS_GRADIENT]}
        locations={[...GLASS_GRADIENT_STOPS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[...SHINE_GRADIENT]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topShine}
      />
      <View style={styles.glossLayer} />
      {children}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: CornerRadius.xxl,
    borderWidth: BorderWidth.thin,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS_BG,
    ...Elevation.xl,
  },
  topShine: {
    ...StyleSheet.absoluteFillObject,
    height: "42%",
  },
  glossLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});
