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
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  showClose?: boolean;
  onClose: () => void;
};

// ─── Poll-sent style (Figma 3859-27171) ──────────────────────────────────────

function PollSentToast({
  message,
  subtitle,
  onClose,
}: Pick<ToastProps, "message" | "subtitle" | "onClose">) {
  return (
    <Pressable onPress={onClose}>
      <Box style={styles.pollSentContainer}>
        {/* Orange circle check icon */}
        <Box style={styles.pollSentIcon}>
          <Check size={22} color={ColorPalette.white} strokeWidth={2.5} />
        </Box>

        {/* Text */}
        <Box style={styles.pollSentText}>
          <Text variant="headingSm" color="gray950" numberOfLines={1}>
            {message}
          </Text>
          {subtitle ? (
            <Text
              variant="bodySmDefault"
              style={styles.pollSentSubtitle}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Pressable>
  );
}

// ─── Default style ────────────────────────────────────────────────────────────

function DefaultToast({
  message,
  action,
  showClose = true,
  onClose,
}: ToastProps) {
  return (
    <Box style={styles.toast}>
      <Box style={styles.checkCircle}>
        <Check size={16} color={ColorPalette.gray900} strokeWidth={2.5} />
      </Box>

      <Text
        variant="bodySmMedium"
        color="gray900"
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
          <Text variant="bodySmMedium" style={styles.actionLabel}>
            {action.label}
          </Text>
        </Pressable>
      )}

      {showClose && !action && (
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <X size={18} color={ColorPalette.gray500} />
        </Pressable>
      )}
    </Box>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Toast(props: ToastProps) {
  if (props.subtitle !== undefined) {
    return <PollSentToast {...props} />;
  }
  return <DefaultToast {...props} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ICON_SIZE = 48;

const styles = StyleSheet.create({
  // Default toast
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Layout.spacing.sm,
    gap: 12,
    shadowColor: ColorPalette.gray900,
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
    color: ColorPalette.statusInfo,
    fontWeight: "600",
  },
  closeButton: {
    padding: 2,
  },

  // Poll-sent toast (matches Figma 3859-27171)
  pollSentContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.md,
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    padding: 8,
    gap: 15,
  },
  pollSentIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: ColorPalette.brand500,
    alignItems: "center",
    justifyContent: "center",
  },
  pollSentText: {
    flex: 1,
    gap: 2,
  },
  pollSentSubtitle: {
    color: "#857c7c",
  },
});
