import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChipVariant = "outlined" | "filled";

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  variant?: ChipVariant;
};

// ─── Component ───────────────────────────────────────────────────────────────

const VARIANT_STYLES = {
  outlined: {
    unselected: {
      backgroundColor: ColorPalette.white,
      borderColor: ColorPalette.gray100,
      textVariant: "bodyXsMedium",
      cornerRadius: CornerRadius.full,
    },
    selected: {
      backgroundColor: ColorPalette.gray900,
      borderColor: "transparent",
      textVariant: "bodyXsMedium",
      cornerRadius: CornerRadius.full,
    },
  },
  filled: {
    unselected: {
      backgroundColor: ColorPalette.gray50,
      borderColor: "transparent",
      textVariant: "bodySmMedium",
      cornerRadius: CornerRadius.sm,
    },
    selected: {
      backgroundColor: ColorPalette.gray950,
      borderColor: "transparent",
      textVariant: "bodySmMedium",
      cornerRadius: CornerRadius.sm,
    },
  },
} as const;

export default function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  icon: Icon,
  variant = "outlined",
}: ChipProps) {
  const variantStyle =
    VARIANT_STYLES[variant][selected ? "selected" : "unselected"];
  const iconColor = selected ? ColorPalette.white : ColorPalette.gray900;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderRadius: variantStyle.cornerRadius,
        borderColor: variantStyle.borderColor,
        backgroundColor: variantStyle.backgroundColor,
        opacity: disabled ? 0.5 : 1,
        overflow: "hidden",
      }}
    >
      {Icon && <Icon size={16} color={iconColor} />}
      <Text
        variant={variantStyle.textVariant}
        style={{ color: iconColor }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
