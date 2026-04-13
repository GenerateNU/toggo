import { useCallback } from "react";
import { Gesture } from "react-native-gesture-handler";
import { Elevation } from "@/design-system/tokens/elevation";
import {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LONG_PRESS_DURATION_MS } from "../constants";

type UseActivityCardGesturesParams = {
  activityId: string;
  draggable?: boolean;
  onPress: () => void;
  onDragStart?: (activityId: string) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  dragScrollCompensationY?: SharedValue<number>;
};

export function useActivityCardGestures({
  activityId,
  draggable = true,
  onPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragScrollCompensationY,
}: UseActivityCardGesturesParams) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handleDragStart = useCallback(() => {
    onDragStart?.(activityId);
  }, [onDragStart, activityId]);

  const handleDragMove = useCallback(
    (absX: number, absY: number) => {
      onDragMove?.(absX, absY);
    },
    [onDragMove],
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const handleTap = useCallback(() => {
    onPress();
  }, [onPress]);

  const panGesture = Gesture.Pan()
    .enabled(draggable)
    .activateAfterLongPress(LONG_PRESS_DURATION_MS)
    .onBegin(() => {
      isDragging.value = true;
      translateX.value = 0;
      translateY.value = 0;
      runOnJS(handleDragStart)();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      runOnJS(handleDragEnd)();
      isDragging.value = false;
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleTap)();
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: isDragging.value ? translateX.value : 0 },
      {
        translateY: isDragging.value
          ? translateY.value + (dragScrollCompensationY?.value ?? 0)
          : 0,
      },
      {
        scale: withSpring(isDragging.value ? 1.05 : 1, {
          damping: 20,
          stiffness: 300,
        }),
      },
    ],
    shadowOpacity: isDragging.value ? 0.2 : Elevation.sm.shadowOpacity,
    shadowRadius: isDragging.value ? 12 : Elevation.sm.shadowRadius,
    shadowOffset: {
      width: 0,
      height: isDragging.value ? 6 : Elevation.sm.shadowOffset.height,
    },
    elevation: isDragging.value ? 8 : Elevation.sm.elevation,
    zIndex: isDragging.value ? 100 : 0,
    opacity: isDragging.value ? 0.7 : 1,
  }));

  return {
    composedGesture,
    animatedStyle,
  };
}
