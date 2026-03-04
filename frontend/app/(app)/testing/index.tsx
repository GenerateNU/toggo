import { getAuthToken } from "@/api/client";
import { Box, Button, Text } from "@/design-system";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Clipboard } from "react-native";

export default function Home() {
  const [jwt, setJwt] = useState<string | null>(null);

  const loadJwt = useCallback(async () => {
    const token = await getAuthToken();
    setJwt(token);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      loadJwt();
    }, 0);
    return () => clearTimeout(id);
  }, [loadJwt]);

  const copyJwt = useCallback(() => {
    if (jwt) Clipboard.setString(jwt);
  }, [jwt]);

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="white"
    >
      <Box
        marginTop="md"
        padding="md"
        borderRadius="sm"
        backgroundColor="surfaceCard"
        alignSelf="stretch"
        gap="xs"
      >
        <Text variant="smLabel" color="textQuaternary">
          Debug: JWT
        </Text>
        <Text
          variant="smLabel"
          color="textQuaternary"
          numberOfLines={3}
          style={{ fontFamily: "monospace" }}
        >
          {jwt ?? "Not signed in"}
        </Text>
        {jwt && (
          <Box alignSelf="flex-start">
            <Button
              layout="textOnly"
              label="Copy JWT"
              variant="Secondary"
              onPress={copyJwt}
            />
          </Box>
        )}
      </Box>
      <Button
        layout="textOnly"
        label="Test Image Upload"
        variant="Primary"
        onPress={() => router.push("/testing/test-upload")}
      />
      <Button
        layout="textOnly"
        label="Test WebSocket Realtime"
        variant="Primary"
        onPress={() => router.push("/testing/test-realtime")}
      />
      <Button
        layout="textOnly"
        label="Test Poll API"
        variant="Primary"
        onPress={() => router.push("/testing/test-poll")}
      />
      <Button
        layout="textOnly"
        label="Test Google Maps API"
        variant="Primary"
        onPress={() => router.push("/testing/test-maps")}
      />
      <Button
        layout="textOnly"
        label="Test Rank Poll API"
        variant="Primary"
        onPress={() => router.push("/testing/test-rank-poll")}
      />
    </Box>
  );
}
