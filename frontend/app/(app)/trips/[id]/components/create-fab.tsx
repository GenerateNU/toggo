import { Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Elevation } from "@/design-system/tokens/elevation";
import { router } from "expo-router";
import { BarChart2, Lightbulb, MapPin, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface CreateFABProps {
  tripID: string;
  onCreatePoll: () => void;
}

const SPRING = { damping: 20, stiffness: 400, mass: 0.6 };

export default function CreateFAB({ tripID, onCreatePoll }: CreateFABProps) {
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 120 });
  };

  const close = () => {
    setOpen(false);
    progress.value = withTiming(0, { duration: 100 });
  };

  const handleAction = (action: () => void) => {
    close();
    action();
  };

  // Overlay
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  // FAB icon rotation: + rotates 45deg → ×
  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg`,
      },
    ],
  }));

  const itemStyle = useAnimatedStyle(() => ({
    opacity: withTiming(progress.value, { duration: 100 }),
    transform: [
      {
        translateY: withSpring(
          interpolate(progress.value, [0, 1], [12, 0]),
          SPRING,
        ),
      },
    ],
  }));

  const actions = [
    {
      label: "Activity",
      icon: MapPin,
      onPress: () => router.push(`/trips/${tripID}/activities/creation`),
    },
    {
      label: "Pitch",
      icon: Lightbulb,
      onPress: () => router.push(`/trips/${tripID}/pitches/creation`),
    },
    {
      label: "Poll",
      icon: BarChart2,
      onPress: onCreatePoll,
    },
  ];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Dimmed overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.overlay, overlayStyle]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
      </Animated.View>

      {/* Items + FAB */}
      <View style={styles.fabArea} pointerEvents="box-none">
        {actions.map((action) => (
          <Animated.View key={action.label} style={itemStyle}>
            <Pressable
              onPress={() => handleAction(action.onPress)}
              style={styles.item}
            >
              <Text variant="smLabel" color="textSecondary">
                {action.label}
              </Text>
              <View style={styles.itemIcon}>
                <action.icon
                  size={16}
                  color={ColorPalette.white}
                  strokeWidth={2}
                />
              </View>
            </Pressable>
          </Animated.View>
        ))}

        {/* FAB button */}
        <Pressable onPress={toggle} style={styles.fab}>
          <Animated.View style={fabIconStyle}>
            <Plus size={24} color={ColorPalette.white} strokeWidth={2.5} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: ColorPalette.surfaceOverlay,
  },
  fabArea: {
    position: "absolute",
    bottom: 32,
    right: 24,
    alignItems: "flex-end",
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ColorPalette.black,
    alignItems: "center",
    justifyContent: "center",
    ...Elevation.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    ...Elevation.md,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ColorPalette.black,
    alignItems: "center",
    justifyContent: "center",
  },
});
