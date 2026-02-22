import { getAuthToken } from "@/api/client";
import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Clipboard, ScrollView } from "react-native";

export default function Home() {
  const { logout, isPending, currentUser } = useUser();
  const [jwt, setJwt] = useState<string | null>(null);
  const displayName = currentUser?.name || currentUser?.username || "Traveler";

  const loadJwt = useCallback(async () => {
    const token = await getAuthToken();
    setJwt(token);
  }, []);

  useEffect(() => {
    loadJwt();
  }, [loadJwt]);

  const copyJwt = useCallback(() => {
    if (jwt) Clipboard.setString(jwt);
  }, [jwt]);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
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

        <Box
          marginTop="m"
          padding="m"
          borderRadius="s"
          backgroundColor="cloudWhite"
          alignSelf="stretch"
          gap="xs"
        >
          <Text variant="caption" color="mountainGray">
            Debug: JWT
          </Text>
          <Text
            variant="caption"
            color="mountainGray"
            numberOfLines={3}
            style={{ fontFamily: "monospace" }}
          >
            {jwt ?? "Not signed in"}
          </Text>
          {jwt && (
            <Button onPress={copyJwt} variant="secondary" alignSelf="flex-start">
              <Text variant="caption" color="cloudWhite">
                Copy JWT
              </Text>
            </Button>
          )}
        </Box>

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

        <Button onPress={() => router.push("/test-poll")} variant="primary">
          <Text variant="caption" color="cloudWhite">
            Test Poll API
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
    </ScrollView>
  );
}
