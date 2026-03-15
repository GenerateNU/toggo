import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import React from "react";
import { Pressable, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
}: ChipProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 9999,
          borderWidth: selected ? 0 : 1,
          borderColor: ColorPalette.borderPrimary,
          backgroundColor: selected ? ColorPalette.black : ColorPalette.white,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          variant="xsLabel"
          style={{ color: selected ? ColorPalette.white : ColorPalette.textSecondary }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
