import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Check, X } from "lucide-react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "../tokens/color";
import { CornerRadius } from "../tokens/corner-radius";
import { Layout } from "../tokens/layout";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastAction = {
  label: string;
  onPress: () => void;
};

type ToastConfig = {
  message: string;
  action?: ToastAction;
  showClose?: boolean;
  duration?: number;
};

type ToastEntry = ToastConfig & {
  id: number;
};

type ToastPosition = "top" | "bottom";

type ToastProviderProps = {
  children: React.ReactNode;
  position?: ToastPosition;
  maxVisible?: number;
};

type ToastContextValue = {
  show: (config: ToastConfig) => void;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TOAST_HEIGHT = 56;
const TOAST_GAP = 10;
const EDGE_INSET = 60;

// ─── Single Toast Item ───────────────────────────────────────────────────────

type ToastItemProps = {
  entry: ToastEntry;
  index: number;
  position: ToastPosition;
  onDismiss: (id: number) => void;
};

const ToastItem = ({ entry, index, position, onDismiss }: ToastItemProps) => {
  const slideDirection = position === "top" ? -1 : 1;
  const translateY = useMemo(() => new Animated.Value(80 * slideDirection), [slideDirection]);
  const enterOpacity = useMemo(() => new Animated.Value(0), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80 * slideDirection,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(enterOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(entry.id));
  }, [translateY, enterOpacity, onDismiss, entry.id, slideDirection]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 300,
      }),
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const dur = entry.duration ?? 4000;
    if (dur > 0) {
      timerRef.current = setTimeout(hide, dur);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entry.duration, hide, translateY, enterOpacity]);

  const offset = EDGE_INSET + index * (TOAST_HEIGHT + TOAST_GAP);
  const positionStyle =
    position === "top" ? { top: offset } : { bottom: offset };

  const showClose = entry.showClose !== false;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        positionStyle,
        {
          transform: [{ translateY }],
          opacity: enterOpacity,
        },
      ]}
    >
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
          {entry.message}
        </Text>

        {entry.action && (
          <Pressable
            onPress={() => {
              entry.action!.onPress();
              hide();
            }}
            hitSlop={8}
          >
            <Text variant="smLabel" style={styles.actionLabel}>
              {entry.action.label}
            </Text>
          </Pressable>
        )}

        {showClose && !entry.action && (
          <Pressable onPress={hide} hitSlop={8} style={styles.closeButton}>
            <X size={18} color={ColorPalette.textQuaternary} />
          </Pressable>
        )}
      </Box>
    </Animated.View>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────

let nextId = 0;

export function ToastProvider({
  children,
  position = "bottom",
  maxVisible = 3,
}: ToastProviderProps) {
  const [queue, setQueue] = useState<ToastEntry[]>([]);

  const show = useCallback((config: ToastConfig) => {
    const id = nextId++;
    setQueue((prev) => [...prev, { ...config, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ show }), [show]);

  const visibleToasts = queue.slice(0, maxVisible);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {visibleToasts.map((entry, i) => (
        <ToastItem
          key={entry.id}
          entry={entry}
          index={i}
          position={position}
          onDismiss={dismiss}
        />
      ))}
    </ToastContext.Provider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
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