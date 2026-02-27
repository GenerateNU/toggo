import { Box, Button } from "@/design-system";
import { router } from "expo-router";

export default function Home() {
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="white"
    >
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
