import { AnimatedBox, Box, Button, Logo } from "@/design-system";
import { Text } from "@/design-system/primitives/text";
import { Layout } from "@/design-system/tokens/layout";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BACKGROUND_IMAGES = [
  require("@/assets/images/splash-1.png"),
  require("@/assets/images/splash-2.jpg"),
  require("@/assets/images/splash-3.jpg"),
];

const ROTATION_INTERVAL_MS = 4000;
const FADE_DURATION_MS = 800;
const DIM_OPACITY = 0.55;

export default function LoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [slotA, setSlotA] = useState(0);
  const [slotB, setSlotB] = useState(1);
  const [opacityA] = useState(() => new Animated.Value(1));
  const [opacityB] = useState(() => new Animated.Value(0));
  const frontSlotRef = useRef<"A" | "B">("A");
  const nextImageIndexRef = useRef(2);

  useEffect(() => {
    const interval = setInterval(() => {
      const isFrontA = frontSlotRef.current === "A";
      const nextImageIndex =
        nextImageIndexRef.current % BACKGROUND_IMAGES.length;

      Animated.parallel([
        Animated.timing(opacityA, {
          toValue: isFrontA ? 0 : 1,
          duration: FADE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacityB, {
          toValue: isFrontA ? 1 : 0,
          duration: FADE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isFrontA) {
          frontSlotRef.current = "B";
          setSlotA(nextImageIndex);
        } else {
          frontSlotRef.current = "A";
          setSlotB(nextImageIndex);
        }
        nextImageIndexRef.current = nextImageIndex + 1;
      });
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [opacityA, opacityB]);

  return (
    <Box flex={1}>
      <AnimatedBox style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
        <ImageBackground
          source={BACKGROUND_IMAGES[slotA]}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </AnimatedBox>
      <AnimatedBox style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
        <ImageBackground
          source={BACKGROUND_IMAGES[slotB]}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </AnimatedBox>

      <Box
        style={StyleSheet.absoluteFill}
        backgroundColor="backgroundOverlay"
        opacity={DIM_OPACITY}
        pointerEvents="none"
      />

      <Box
        flex={1}
        paddingHorizontal="lg"
        justifyContent="space-between"
        alignItems="center"
        style={{
          paddingTop: insets.top + Layout.spacing.sm,
          paddingBottom: insets.bottom + Layout.spacing.md,
        }}
      >
        <Logo color="white" size="xl" />

        <Box flexDirection="row" alignItems="flex-end" justifyContent="center">
          <Box opacity={0.7}>
            <Text variant="logoXxl" color="white">
              ready, set,{" "}
            </Text>
          </Box>
          <Text variant="logoXxl" color="white">
            toggo
          </Text>
        </Box>

        <Box alignSelf="stretch">
          <Button
            layout="textOnly"
            label="Log in or create an account"
            variant="PrimaryBrand"
            onPress={() => router.push("/(auth)/phone")}
          />
        </Box>
      </Box>
    </Box>
  );
}
