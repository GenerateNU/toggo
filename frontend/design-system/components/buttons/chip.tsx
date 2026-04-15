import { usePressScale } from "@/design-system/hooks/usePressScale";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { LucideIcon } from "lucide-react-native";
import { Animated, Pressable } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChipVariant = "outlined" | "filled" | "subtle";

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  variant?: ChipVariant;
  iconSize?: number;
  style?: any;
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
      backgroundColor: ColorPalette.gray25,
      borderColor: "transparent",
      textVariant: "bodyMedium",
      cornerRadius: CornerRadius.sm,
    },
    selected: {
      backgroundColor: ColorPalette.brand500,
      borderColor: "transparent",
      textVariant: "bodyMedium",
      cornerRadius: CornerRadius.sm,
    },
  },
  subtle: {
    unselected: {
      backgroundColor: ColorPalette.gray50,
      borderColor: "transparent",
      textVariant: "bodySmMedium",
      cornerRadius: CornerRadius.sm,
    },
    selected: {
      backgroundColor: ColorPalette.gray50,
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
  iconSize = 16,
  style,
}: ChipProps) {
  const variantStyle =
    VARIANT_STYLES[variant][selected ? "selected" : "unselected"];
  const iconColor =
    variant === "subtle"
      ? ColorPalette.gray600
      : selected
        ? ColorPalette.white
        : ColorPalette.gray900;

  const { scaleAnim, onPressIn, onPressOut } = usePressScale({
    pressedScale: 0.95,
    isDisabled: disabled,
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: Layout.spacing.xs,
          borderWidth: 1,
          borderRadius: variantStyle.cornerRadius,
          borderColor: variantStyle.borderColor,
          backgroundColor: variantStyle.backgroundColor,
          opacity:
            variant === "subtle" ? 1 : disabled ? 0.5 : pressed ? 0.9 : 1,
          overflow: "hidden",
          ...style,
        })}
      >
        {Icon && <Icon size={iconSize} color={iconColor} />}
        <Text variant={variantStyle.textVariant} style={{ color: iconColor }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
