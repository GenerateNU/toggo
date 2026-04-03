import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  icon: Icon,
}: ChipProps) {
  const iconColor = selected
    ? ColorPalette.white
    : ColorPalette.gray900;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 9999,
          borderWidth: selected ? 0 : 1,
          borderColor: ColorPalette.gray300,
          backgroundColor: selected
            ? ColorPalette.gray900
            : ColorPalette.white,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {Icon && <Icon size={12} color={iconColor} />}
        <Text variant="bodyXsMedium" style={{ color: iconColor }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
