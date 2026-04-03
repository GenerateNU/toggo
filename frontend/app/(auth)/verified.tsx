import PaperPlaneSvg from "@/assets/icons/paper-plane.svg";
import PathSvg from "@/assets/icons/path.svg";
import PlaneSvg from "@/assets/icons/plane.svg";
import { Box, Text } from "@/design-system";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PATH_SCALE = (SCREEN_WIDTH * 1.3) / 541;
const PATH_WIDTH = Math.round(541 * PATH_SCALE);
const PATH_HEIGHT = Math.round(461 * PATH_SCALE);
const PATH_OFFSET_X = (SCREEN_WIDTH - PATH_WIDTH) / 2;

const PLANE_X = Math.round(356 * PATH_SCALE) - 23;
const PLANE_Y = Math.round(1.9 * PATH_SCALE) - 8;

const PAPER_PLANE_X = Math.round(139 * PATH_SCALE) - 18;
const PAPER_PLANE_Y = Math.round(458 * PATH_SCALE) - 15;

const PATH_CONTAINER_TOP = SCREEN_HEIGHT * 0.22;
const TEXT_TOP = SCREEN_HEIGHT * 0.42;

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
          top: PATH_CONTAINER_TOP,
          left: PATH_OFFSET_X,
        }}
      >
        <PathSvg width={PATH_WIDTH} height={PATH_HEIGHT} />
        <Box style={{ position: "absolute", left: PLANE_X, top: PLANE_Y }}>
          <PlaneSvg width={46} height={30} />
        </Box>
        <Box
          style={{
            position: "absolute",
            left: PAPER_PLANE_X,
            top: PAPER_PLANE_Y,
          }}
        >
          <PaperPlaneSvg width={37} height={30} />
        </Box>
      </Box>

      <Box
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: TEXT_TOP,
        }}
        alignItems="center"
        paddingHorizontal="xl"
        gap="xs"
      >
        <Box
          backgroundColor="white"
          paddingHorizontal="xxs"
          paddingVertical="sm"
          borderRadius="md"
          alignItems="center"
          gap="xs"
        >
          <Text variant="headingMd" color="gray900" textAlign="center">
            You've been verified
          </Text>
          <Text variant="bodyDefault" color="gray900" textAlign="center">
            Plan or join a trip now!
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
