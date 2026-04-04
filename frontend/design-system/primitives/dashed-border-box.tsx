import React, { useState } from "react";
import { LayoutChangeEvent, View, ViewProps } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { ColorPalette, ColorName } from "../tokens/color";
import { CornerRadius, CornerRadiusKey } from "../tokens/corner-radius";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DashedBorderBoxProps = ViewProps & {
  children?: React.ReactNode;
  color?: ColorName;
  strokeWidth?: number;
  dashLength?: number;
  dashGap?: number;
  borderRadius?: CornerRadiusKey;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashedBorderBox({
  children,
  color = "gray300",
  strokeWidth = 1,
  dashLength = 8,
  dashGap = 4,
  borderRadius: radiusKey = "md",
  style,
  ...rest
}: DashedBorderBoxProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const radius = CornerRadius[radiusKey];
  const stroke = ColorPalette[color];
  const offset = strokeWidth / 2;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View
      onLayout={handleLayout}
      style={[{ position: "relative" }, style]}
      {...rest}
    >
      {size.width > 0 && (
        <Svg
          width={size.width}
          height={size.height}
          style={{ position: "absolute", top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Rect
            x={offset}
            y={offset}
            width={size.width - strokeWidth}
            height={size.height - strokeWidth}
            rx={radius}
            ry={radius}
            fill="transparent"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${dashGap}`}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}
