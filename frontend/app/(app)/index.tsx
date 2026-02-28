import { useUser } from "@/contexts/user";
import { Box, Button, Text } from "@/design-system";
import { router } from "expo-router";

export default function Home() {
  const { currentUser } = useUser();

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="white"
    >
      <Text variant="lgHeading">Home</Text>
      {currentUser?.username && (
        <Text variant="smParagraph" color="textSecondary">
          Hello @{currentUser.username}
        </Text>
      )}
      <Button
        layout="textOnly"
        label="Settings"
        variant="Primary"
        onPress={() => router.push("/settings")}
      />
      <Button
        layout="textOnly"
        label="Proof of Concept"
        variant="Primary"
        onPress={() => router.push("/testing")}
      />
      <Button
        layout="textOnly"
        label="Design System"
        variant="Primary"
        onPress={() => router.push("/ui-kit")}
      />
    </Box>
  );
}
