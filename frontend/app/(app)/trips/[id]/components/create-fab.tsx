import { Box, Button } from "@/design-system";
import { router } from "expo-router";
import { BarChart2, Lightbulb, MapPin, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedBox = Animated.createAnimatedComponent(Box);

interface CreateFABProps {
  tripID: string;
  onCreatePoll: () => void;
  onCreateActivity: () => void;
  /** Opens the mood board “Add to …” bottom sheet (no radial sub-menu). */
  onOpenMoodBoardAdd?: () => void;
}

const SPRING = { damping: 20, stiffness: 400, mass: 0.6 };

const ABSOLUTE_FILL = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export default function CreateFAB({
  tripID,
  onCreatePoll,
  onCreateActivity,
  onOpenMoodBoardAdd,
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

  const actions = useMemo(
    () => [
      {
        label: "Activity",
        icon: MapPin,
        onPress: onCreateActivity,
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
    ],
    [onCreateActivity, onCreatePoll, tripID],
  );

  if (onOpenMoodBoardAdd) {
    return (
      <Box style={ABSOLUTE_FILL} pointerEvents="box-none">
        <Box
          position="absolute"
          bottom={32}
          right={24}
          alignItems="flex-end"
          pointerEvents="box-none"
        >
          <Button
            layout="iconOnly"
            icon={Plus}
            accessibilityLabel="Add mood board item"
            variant="IconCircular"
            size="large"
            onPress={onOpenMoodBoardAdd}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box style={ABSOLUTE_FILL} pointerEvents="box-none">
      <AnimatedBox
        style={[ABSOLUTE_FILL, overlayStyle]}
        backgroundColor="backgroundOverlay"
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable style={ABSOLUTE_FILL} onPress={close} />
      </AnimatedBox>

      <Box
        position="absolute"
        bottom={32}
        right={24}
        alignItems="flex-end"
        gap="sm"
        pointerEvents="box-none"
      >
        {actions.map((action) => (
          <AnimatedBox key={action.label} style={itemStyle}>
            <Button
              layout="leadingIcon"
              label={action.label}
              leftIcon={action.icon}
              onPress={() => handleAction(action.onPress)}
            />
          </AnimatedBox>
        ))}

        <AnimatedBox style={fabIconStyle}>
          <Button
            layout="iconOnly"
            icon={Plus}
            accessibilityLabel="Open create menu"
            variant="IconCircular"
            size="large"
            onPress={toggle}
          />
        </AnimatedBox>
      </Box>
    </Box>
  );
}
