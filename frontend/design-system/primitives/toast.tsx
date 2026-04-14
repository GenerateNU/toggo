import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Check, X } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "../tokens/color";
import { CoreSize } from "../tokens/core-size";
import { CornerRadius } from "../tokens/corner-radius";
import { Shadow } from "../tokens/elevation";
import { Layout } from "../tokens/layout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "neutral";

export type ToastProps = {
  message: string;
  subtitle?: string;
  variant?: ToastVariant;
  action?: {
    label: string;
    onPress: () => void;
  };
  showClose?: boolean;
  onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Toast({
  message,
  subtitle,
  variant = "neutral",
  action,
  showClose = true,
  onClose,
}: ToastProps) {
  const iconColor =
    variant === "success" ? ColorPalette.brand500 : ColorPalette.gray950;

  return (
    <Box style={styles.container}>
      <Box style={styles.content}>
        <Check size={CoreSize.iconSm} color={iconColor} strokeWidth={2.5} />

        {variant === "success" ? (
          <Box style={styles.textStack}>
            <Text variant="headingSm" color="gray950" numberOfLines={1}>
              {message}
            </Text>
            {subtitle ? (
              <Text
                variant="bodySmDefault"
                style={styles.subtitle}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </Box>
        ) : (
          <Text
            variant="bodyMedium"
            color="gray950"
            style={styles.message}
            numberOfLines={2}
          >
            {message}
          </Text>
        )}
      </Box>

      {action ? (
        <Pressable
          onPress={() => {
            try {
              action.onPress();
            } finally {
              onClose();
            }
          }}
          hitSlop={8}
        >
          <Text variant="bodyStrong" style={styles.actionLabel}>
            {action.label}
          </Text>
        </Pressable>
      ) : showClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        >
          <X size={CoreSize.iconSm} color={ColorPalette.gray950} />
        </Pressable>
      ) : null}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.xl,
    paddingVertical: Layout.spacing.sm + Layout.spacing.xxs,
    paddingHorizontal: Layout.spacing.sm,
    gap: Layout.spacing.sm,
    ...Shadow.md,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
  message: {
    flex: 1,
  },
  textStack: {
    flex: 1,
  },
  subtitle: {
    color: ColorPalette.gray500,
  },
  actionLabel: {
    color: ColorPalette.blue500,
  },
});
