import { useUser } from "@/contexts/user";
import { Box, Text } from "@/design-system";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const { isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/(app)");
      } else {
        router.replace("/(auth)/login");
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, router]);

  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="space-between"
      padding="lg"
      paddingBottom="xl"
    >
      <Box flex={1} justifyContent="center" alignItems="center" gap="lg">
        <Text variant="xxlHeading" color="textSecondary">
          🏖️
        </Text>
      </Box>

      <Box gap="xs">
        <Text
          variant="xxlHeading"
          color="textSecondary"
          style={{ lineHeight: 38 }}
        >
          group trips shouldn't die in the group chat
        </Text>
      </Box>
    </Box>
  );
}
