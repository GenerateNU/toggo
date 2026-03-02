import { Box, Text } from "@/design-system";
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
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="center"
      alignItems="center"
      padding="xl"
      gap="xl"
    >
      <Box width={180} height={160} justifyContent="center" alignItems="center">
        <Text variant="xxlHeading" color="textSecondary">
          ✈️
        </Text>
      </Box>

      <Box alignItems="center" gap="sm">
        <Text variant="xxlHeading" color="textSecondary" textAlign="center">
          You've been verified
        </Text>
        <Text variant="mdParagraph" color="textQuaternary" textAlign="center">
          Plan or join a trip now !
        </Text>
      </Box>
    </Box>
  );
}
