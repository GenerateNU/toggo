import { ColorPalette } from "@/design-system/tokens/color";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleProp, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProgressBarCurvedProps = {
  /** Progress value between 0 and 100 */
  percent: number;
  /** Diameter of the arc */
  size?: number;
  /** Thickness of the stroke */
  strokeWidth?: number;
  /** Fill color */
  fillColor?: string;
  /** Track (background) color */
  trackColor?: string;
  /** Duration of the fill animation in ms */
  duration?: number;
  /** Additional style overrides on the outer container */
  style?: StyleProp<ViewStyle>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ARC_START = 135;
const ARC_SWEEP = 270;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProgressBarCurved({
  percent,
  size = 120,
  strokeWidth = 10,
  fillColor = ColorPalette.statusProgress,
  trackColor = ColorPalette.gray50,
  duration = 800,
  style,
}: ProgressBarCurvedProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;

  const trackPath = describeArc(
    cx,
    cy,
    radius,
    ARC_START,
    ARC_START + ARC_SWEEP,
  );

  const [fillPath, setFillPath] = useState("");
  const [animatedValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Listen to animated value and rebuild the SVG path each frame
    const id = animatedValue.addListener(({ value }) => {
      const sweep = (value / 100) * ARC_SWEEP;
      if (sweep < 0.5) {
        setFillPath("");
      } else {
        setFillPath(describeArc(cx, cy, radius, ARC_START, ARC_START + sweep));
      }
    });

    return () => animatedValue.removeListener(id);
  }, [animatedValue, cx, cy, radius]);

  useEffect(() => {
    // Delay so the component mounts at 0 before animating
    const timeout = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: clampedPercent,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 50);

    return () => clearTimeout(timeout);
  }, [clampedPercent, duration, animatedValue]);

  return (
    <View
      style={[
        { width: size, height: size, transform: [{ rotate: "90deg" }] },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Path
          d={trackPath}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {/* Animated fill */}
        {fillPath !== "" && (
          <Path
            d={fillPath}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
}
