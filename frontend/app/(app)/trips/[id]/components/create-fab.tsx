import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { router } from "expo-router";
import {
  BarChart2,
  BedDouble,
  Lightbulb,
  MapPin,
  Plus,
  type LucideIcon,
} from "lucide-react-native";
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
  onCreateActivity: () => void;
  onCreateHousing: () => void;
}

const SPRING = { damping: 20, stiffness: 400, mass: 0.6 };

const FAB_ICON_SIZE = 20;

export default function CreateFAB({
  tripID,
  onCreatePoll,
  onCreateActivity,
  onCreateHousing,
}: CreateFABProps) {
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

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
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

  const actions: { label: string; icon: LucideIcon; onPress: () => void }[] = [
    {
      label: "Activity",
      icon: MapPin,
      onPress: onCreateActivity,
    },
    {
      label: "Housing",
      icon: BedDouble,
      onPress: onCreateHousing,
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
    <Box
      style={[StyleSheet.absoluteFill, styles.root]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, overlayStyle]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          <View style={styles.overlay} />
        </Pressable>
      </Animated.View>

      <Box
        position="absolute"
        bottom={32}
        right={24}
        alignItems="flex-end"
        gap="sm"
        pointerEvents="box-none"
      >
        {actions.map((action) => (
          <Animated.View key={action.label} style={itemStyle}>
            <Pressable
              onPress={() => handleAction(action.onPress)}
              style={styles.actionButton}
            >
              <action.icon size={FAB_ICON_SIZE} color={ColorPalette.gray900} />
              <Text variant="bodyMedium" color="gray900">
                {action.label}
              </Text>
            </Pressable>
          </Animated.View>
        ))}

        <Animated.View style={fabIconStyle}>
          <Pressable onPress={toggle} style={styles.fab}>
            <Plus size={24} color={ColorPalette.gray900} />
          </Pressable>
        </Animated.View>
      </Box>
    </Box>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  root: {
    zIndex: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ColorPalette.backgroundOverlay,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: CornerRadius.full,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    borderRadius: CornerRadius.xl,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
