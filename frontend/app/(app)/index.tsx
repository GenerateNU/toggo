import { useUser } from "@/contexts/user";
import { Box, Button, Text } from "@/design-system";
import { router } from "expo-router";

export default function Home() {
  const { currentUser, logout, isPending } = useUser();
  const displayName = currentUser?.name || currentUser?.username || "Traveler";

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="white"
    >
      <Text variant="lgHeading">Welcome, {displayName} ✨</Text>
      {currentUser?.username && (
        <Text variant="smParagraph" color="textSecondary">
          @{currentUser.username}
        </Text>
      )}

      <Button
        layout="textOnly"
        label="Proof of Concept"
        variant="Primary"
        onPress={() => router.push("/testing")}
      />
      <Button
        layout="textOnly"
        label="UI Kit / Design System"
        variant="Primary"
        onPress={() => router.push("/ui-kit")}
      />
      <Button
        layout="textOnly"
        label="Logout"
        variant="Secondary"
        loading={isPending}
        loadingLabel="Logging out..."
        disabled={isPending}
        onPress={logout}
      />
    </Box>
  );
}
