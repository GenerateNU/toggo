import { Box, Illustration, Screen, Text } from "@/design-system";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function VerifiedPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(app)");
    }, 2000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <Screen>
      <Box
        flex={1}
        backgroundColor="backgroundCard"
        justifyContent="center"
        alignItems="center"
        padding="xl"
      >
        <Box width="auto" justifyContent="center" alignItems="center">
          <Illustration />
        </Box>

        <Box alignItems="center">
          <Text variant="headingMd" color="textDefault" textAlign="center">
            You've been verified
          </Text>
          <Text variant="bodyDefault" color="textSubtle" textAlign="center">
            Plan or join a trip now!
          </Text>
        </Box>
      </Box>
    </Screen>
  );
}
