import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Check, X } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "../tokens/color";
import { CoreSize } from "../tokens/core-size";
import { CornerRadius } from "../tokens/corner-radius";
import { Layout } from "../tokens/layout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastProps = {
  message: string;
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
  action,
  showClose = true,
  onClose,
}: ToastProps) {
  return (
    <Box style={styles.toast}>
      <Box style={styles.checkCircle}>
        <Check size={16} color={ColorPalette.textSecondary} strokeWidth={2.5} />
      </Box>

      <Text
        variant="smLabel"
        color="textSecondary"
        style={styles.message}
        numberOfLines={2}
      >
        {message}
      </Text>

      {action && (
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
          <Text variant="smLabel" style={styles.actionLabel}>
            {action.label}
          </Text>
        </Pressable>
      )}

      {showClose && !action && (
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <X size={18} color={ColorPalette.textQuaternary} />
        </Pressable>
      )}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Layout.spacing.sm,
    gap: 12,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  checkCircle: {
    width: CoreSize.sm,
    height: CoreSize.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
  },
  actionLabel: {
    color: ColorPalette.info,
    fontWeight: "600",
  },
  closeButton: {
    padding: 2,
  },
});
