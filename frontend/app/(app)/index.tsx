import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { router } from "expo-router";

export default function Home() {
  const { logout, isPending, currentUser } = useUser();
  const displayName = currentUser?.name || currentUser?.username || "Traveler";
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="l"
      gap="m"
    >
      <Text variant="bodyLargeBold">Welcome, {displayName} ✨</Text>
      {currentUser?.username && (
        <Text variant="caption" color="forestGreen">
          @{currentUser.username}
        </Text>
      )}

      <Button onPress={() => router.push("/test-upload")} variant="primary">
        <Text variant="caption" color="cloudWhite">
          Test Image Upload
        </Text>
      </Button>

      <Button onPress={() => router.push("/test-realtime")} variant="primary">
        <Text variant="caption" color="cloudWhite">
          Test WebSocket Realtime
        </Text>
      </Button>

      <Button onPress={() => router.push("/test-maps")} variant="primary">
        <Text variant="caption" color="cloudWhite">
          Test Google Maps API
        </Text>
      </Button>

      <Button onPress={logout} disabled={isPending} variant="secondary">
        <Text variant="caption" color="cloudWhite">
          Logout
        </Text>
      </Button>
    </Box>
  );
}
