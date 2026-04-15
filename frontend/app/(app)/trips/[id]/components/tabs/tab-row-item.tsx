import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { GripVertical, Lock } from "lucide-react-native";
import { StyleSheet, Switch } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { ROW_HEIGHT, SPRING_CONFIG } from "./hooks/useTabReorder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabRowItemProps {
  tab: ModelsCategoryAPIResponse;
  index: number;
  totalTabs: number;
  isAdmin: boolean;
  dragIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  onToggle: () => void;
  onDragStart: (index: number) => void;
  onDragEnd: (translationY: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LONG_PRESS_MS = 200;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TabRowItem({
  tab,
  index,
  totalTabs,
  isAdmin,
  dragIndex,
  dragY,
  onToggle,
  onDragStart,
  onDragEnd,
}: TabRowItemProps) {
  const label = tab.label ?? tab.name ?? "";
  const isVisible = !tab.is_hidden;

  const dragGesture = Gesture.Pan()
    .enabled(isAdmin)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onBegin(() => {
      dragIndex.value = index;
      dragY.value = 0;
      runOnJS(onDragStart)(index);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
    })
    .onFinalize((e) => {
      const finalY = e.translationY;
      dragIndex.value = -1;
      dragY.value = withSpring(0, SPRING_CONFIG);
      runOnJS(onDragEnd)(finalY);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = dragIndex.value === index;

    if (isDragging) {
      return {
        transform: [
          { translateY: dragY.value },
          { scale: withSpring(1.02, SPRING_CONFIG) },
        ],
        zIndex: 100,
        shadowOpacity: Elevation.md.shadowOpacity,
        shadowRadius: Elevation.md.shadowRadius,
        shadowOffset: Elevation.md.shadowOffset,
        elevation: Elevation.md.elevation,
        opacity: 0.95,
      };
    }

    if (dragIndex.value === -1) {
      return {
        transform: [{ translateY: withSpring(0, SPRING_CONFIG) }],
        zIndex: 0,
      };
    }

    const draggedFrom = dragIndex.value;
    const draggedTo = Math.round(
      Math.max(
        0,
        Math.min(totalTabs - 1, draggedFrom + dragY.value / ROW_HEIGHT),
      ),
    );

    let shift = 0;
    if (draggedFrom < draggedTo && index > draggedFrom && index <= draggedTo) {
      shift = -ROW_HEIGHT;
    } else if (
      draggedFrom > draggedTo &&
      index < draggedFrom &&
      index >= draggedTo
    ) {
      shift = ROW_HEIGHT;
    }

    return {
      transform: [{ translateY: withSpring(shift, SPRING_CONFIG) }],
      zIndex: 0,
    };
  });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {isAdmin ? (
          <Box style={styles.handle}>
            <GripVertical size={20} color={ColorPalette.gray400} />
          </Box>
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

        <Switch
          value={isVisible}
          onValueChange={onToggle}
          disabled={!isAdmin}
          trackColor={{
            false: ColorPalette.gray200,
            true: ColorPalette.blue500,
          }}
          thumbColor={ColorPalette.white}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    paddingHorizontal: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ColorPalette.gray100,
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.sm,
  },
  handle: {
    padding: Layout.spacing.xs,
    marginRight: Layout.spacing.xs,
  },
  labelContainer: {
    flex: 1,
  },
});