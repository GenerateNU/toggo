import GlobeSvg from "@/assets/icons/globe.svg";
import { Box, Logo, Text } from "@/design-system";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GLOBE_SIZE = Math.round(SCREEN_WIDTH * 1.3);
const GLOBE_BOTTOM = -Math.round(GLOBE_SIZE * 0.5);
const GLOBE_LEFT = Math.round((SCREEN_WIDTH - GLOBE_SIZE) / 2);

export default function VerifiedPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(app)");
    }, 2000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <Box flex={1} backgroundColor="white" style={{ overflow: "hidden" }}>
      <Box
        style={{
          position: "absolute",
          bottom: GLOBE_BOTTOM,
          left: GLOBE_LEFT,
          width: GLOBE_SIZE,
          height: GLOBE_SIZE,
        }}
      >
        <GlobeSvg width={GLOBE_SIZE} height={GLOBE_SIZE} />
      </Box>

      <Box alignItems="center" style={{ paddingTop: SCREEN_HEIGHT * 0.12 }}>
        <Logo size="xl" />
      </Box>

      <Box
        style={{
          position: "absolute",
          top: SCREEN_HEIGHT * 0.4,
          left: 0,
          right: 0,
        }}
        alignItems="center"
        paddingHorizontal="xl"
        gap="xs"
      >
        <Text variant="headingMd" color="black" textAlign="center">
          You've been verified
        </Text>
        <Text variant="bodyDefault" color="black" textAlign="center">
          Plan or join a trip now!
        </Text>
      </Box>
    </Box>
  );
}
