import Toggle from "@/design-system/components/buttons/toggle";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { GripVertical, Lock } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  ROW_HEIGHT,
  SPRING_CONFIG,
  SWAP_THRESHOLD,
} from "./hooks/useTabReorder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabRowItemProps {
  tab: ModelsCategoryAPIResponse;
  index: number;
  isDragging: boolean;
  isAdmin: boolean;
  dragIndex: SharedValue<number>;
  translateY: SharedValue<number>;
  swapBudget: SharedValue<number>;
  listLength: SharedValue<number>;
  onToggle: () => void;
  setDragging: (name: string | null) => void;
  doSwap: (from: number, to: number) => void;
  onDragEnd: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TabRowItem({
  tab,
  index,
  isDragging,
  isAdmin,
  dragIndex,
  translateY,
  swapBudget,
  listLength,
  onToggle,
  setDragging,
  doSwap,
  onDragEnd,
}: TabRowItemProps) {
  const label = tab.label ?? tab.name ?? "";
  const isVisible = !tab.is_hidden;
  const tabName = tab.name ?? "";

  const dragGesture = Gesture.Pan()
    .enabled(isAdmin)
    .onBegin(() => {
      dragIndex.value = index;
      swapBudget.value = 0;
      translateY.value = 0;
      runOnJS(setDragging)(tabName);
    })
    .onUpdate((e) => {
      const relY = e.translationY - swapBudget.value;
      translateY.value = relY;

      const ai = dragIndex.value;
      const len = listLength.value;

      if (relY > SWAP_THRESHOLD && ai < len - 1) {
        dragIndex.value = ai + 1;
        swapBudget.value += ROW_HEIGHT;
        runOnJS(doSwap)(ai, ai + 1);
      } else if (relY < -SWAP_THRESHOLD && ai > 0) {
        dragIndex.value = ai - 1;
        swapBudget.value -= ROW_HEIGHT;
        runOnJS(doSwap)(ai, ai - 1);
      }
    })
    .onFinalize(() => {
      dragIndex.value = -1;
      translateY.value = withSpring(0, SPRING_CONFIG);
      runOnJS(setDragging)(null);
      runOnJS(onDragEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: isDragging ? translateY.value : 0 },
      { scale: withSpring(isDragging ? 1.05 : 1, SPRING_CONFIG) },
    ],
    shadowOpacity: isDragging ? 0.15 : 0,
    shadowRadius: isDragging ? 8 : 0,
    shadowOffset: { width: 0, height: isDragging ? 4 : 0 },
    elevation: isDragging ? 6 : 0,
    zIndex: isDragging ? 10 : 0,
  }));

  return (
    <Animated.View
      style={[
        styles.row,
        (!isAdmin || !isVisible) && styles.rowDimmed,
        animatedStyle,
      ]}
    >
      {isAdmin ? (
        <GestureDetector gesture={dragGesture}>
          <Animated.View style={styles.handle} hitSlop={12}>
            <GripVertical size={20} color={ColorPalette.gray950} />
          </Animated.View>
        </GestureDetector>
      ) : (
        <Box style={styles.handle}>
          <Lock size={16} color={ColorPalette.gray400} />
        </Box>
      )}

      <Box style={styles.labelContainer}>
        <Text variant="bodySmDefault" color="gray900">
          {label}
        </Text>
      </Box>

      <Toggle
        value={isVisible}
        onChange={onToggle}
        disabled={!isAdmin}
        onColor={ColorPalette.blue500}
        compact
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.gray50,
    paddingRight: Layout.spacing.sm,
  },
  handle: {
    padding: Layout.spacing.xs,
    marginRight: Layout.spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  labelContainer: {
    flex: 1,
  },
  rowDimmed: {
    opacity: 0.45,
  },
});
