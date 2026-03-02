import { useUser } from "@/contexts/user";
import { Box, Button, Text } from "@/design-system";
import { useCreateTrip } from "@/index";
import { router } from "expo-router";

export default function Home() {
  const { currentUser } = useUser();
  const createTripMutation = useCreateTrip();

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
      <Button
        layout="textOnly"
        label={createTripMutation.isPending ? "Creating..." : "Create Trip"}
        variant="Primary"
        disabled={createTripMutation.isPending}
        onPress={async () => {
          const data = {
            name: "New Trip",
            budget_min: 1,
            budget_max: 1000,
          };
          try {
            const result = await createTripMutation.mutateAsync({ data });
            if (result?.id) {
              router.push(`/trips/${result.id}`);
            }
          } catch (e) {
            console.log("Error creating trip", e);
          }
        }}
      />
    </Box>
  );
}
