import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Check, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "../tokens/color";
import { CornerRadius } from "../tokens/corner-radius";
import { Layout } from "../tokens/layout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastProps = {
  visible: boolean;
  message: string;
  action?: ToastAction;
  showClose?: boolean;
  onClose: () => void;
  duration?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Toast({
  visible,
  message,
  action,
  showClose = true,
  onClose,
  duration = 4000,
}: ToastProps) {
  const translateY = useMemo(() => new Animated.Value(80), []);
  const opacity = useMemo(() => new Animated.Value(0), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [translateY, opacity, onClose]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        timerRef.current = setTimeout(hide, duration);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, hide, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity }]}
    >
      <Box style={styles.toast}>
        <Box style={styles.checkCircle}>
          <Check
            size={16}
            color={ColorPalette.textSecondary}
            strokeWidth={2.5}
          />
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
              action.onPress();
              hide();
            }}
            hitSlop={8}
          >
            <Text variant="smLabel" style={styles.actionLabel}>
              {action.label}
            </Text>
          </Pressable>
        )}

        {showClose && !action && (
          <Pressable onPress={hide} hitSlop={8} style={styles.closeButton}>
            <X size={18} color={ColorPalette.textQuaternary} />
          </Pressable>
        )}
      </Box>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: Layout.spacing.md,
    right: Layout.spacing.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  checkCircle: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
  },
  actionLabel: {
    color: "#2563EB",
    fontWeight: "600",
  },
  closeButton: {
    padding: 2,
  },
});
