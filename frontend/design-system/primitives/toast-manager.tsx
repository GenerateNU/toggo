import { Box } from "@/design-system/primitives/box";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet } from "react-native";
import { Layout } from "../tokens/layout";
import Toast from "./toast";

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
  dismissing?: boolean;
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
  visibleIndex: number;
  position: ToastPosition;
  onStartDismiss: (id: number) => void;
  onCompleteDismiss: (id: number) => void;
};

const ToastItem = ({
  entry,
  visibleIndex,
  position,
  onStartDismiss,
  onCompleteDismiss,
}: ToastItemProps) => {
  const slideDirection = position === "top" ? -1 : 1;
  const slideY = useMemo(
    () => new Animated.Value(80 * slideDirection),
    [slideDirection],
  );
  const positionY = useMemo(() => new Animated.Value(0), []);
  const enterOpacity = useMemo(() => new Animated.Value(0), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    onStartDismiss(entry.id);
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: 80 * slideDirection,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(enterOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onCompleteDismiss(entry.id));
  }, [
    slideY,
    enterOpacity,
    onStartDismiss,
    onCompleteDismiss,
    entry.id,
    slideDirection,
  ]);

  useEffect(() => {
    // Don't animate in if already dismissing
    if (entry.dismissing) return;

    Animated.parallel([
      Animated.spring(slideY, {
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
  }, [entry.duration, entry.dismissing, hide, slideY, enterOpacity]);

  // Animate position when visibleIndex changes
  useEffect(() => {
    const targetOffset = visibleIndex * (TOAST_HEIGHT + TOAST_GAP);
    // For bottom position, move UP (negative), for top position, move DOWN (positive)
    const adjustedOffset = position === "bottom" ? -targetOffset : targetOffset;
    Animated.spring(positionY, {
      toValue: adjustedOffset,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }, [visibleIndex, positionY, position]);

  // Use fixed positioning and combine both translateY values
  const fixedPosition =
    position === "top" ? { top: EDGE_INSET } : { bottom: EDGE_INSET };
  const combinedTranslateY = Animated.add(slideY, positionY);

  const showClose = entry.showClose !== false;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        fixedPosition,
        {
          transform: [{ translateY: combinedTranslateY }],
          opacity: enterOpacity,
        },
      ]}
    >
      <Toast
        message={entry.message}
        action={entry.action}
        showClose={showClose}
        onClose={hide}
      />
    </Animated.View>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({
  children,
  position = "bottom",
  maxVisible = 3,
}: ToastProviderProps) {
  const [queue, setQueue] = useState<ToastEntry[]>([]);
  const nextIdRef = useRef<number>(0);

  const show = useCallback(
    (config: ToastConfig) => {
      setQueue((prev) => {
        const id = nextIdRef.current++;
        const newQueue = [{ ...config, id }, ...prev];

        // If we exceed maxVisible, keep only the most recent maxVisible toasts
        return newQueue.slice(0, maxVisible);
      });
    },
    [maxVisible],
  );

  const startDismiss = useCallback((id: number) => {
    setQueue((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
    );
  }, []);

  const completeDismiss = useCallback((id: number) => {
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ show }), [show]);

  const visibleToasts = queue.slice(0, maxVisible);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <Box style={styles.overlay}>
        {visibleToasts.map((entry, i) => {
          // Calculate visible index (excluding dismissing toasts before this one)
          const visibleIndex = visibleToasts
            .slice(0, i)
            .filter((t) => !t.dismissing).length;

          return (
            <ToastItem
              key={entry.id}
              entry={entry}
              visibleIndex={visibleIndex}
              position={position}
              onStartDismiss={startDismiss}
              onCompleteDismiss={completeDismiss}
            />
          );
        })}
      </Box>
    </ToastContext.Provider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "box-none" as const,
    zIndex: 9999,
  },
  toastContainer: {
    position: "absolute",
    left: Layout.spacing.md,
    right: Layout.spacing.md,
  },
});
