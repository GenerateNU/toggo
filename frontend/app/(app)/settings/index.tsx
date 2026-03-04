import { useDeleteUser } from "@/api";
import { useUser } from "@/contexts/user";
import { Box, Button, Screen, Text } from "@/design-system";
import { router } from "expo-router";

export default function Settings() {
  const { currentUser, logout, isPending } = useUser();
  const userId = currentUser?.id ?? "";
  const { mutate: deleteUserData, isPending: isDeletePending } =
    useDeleteUser();

  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding="lg"
        gap="md"
        backgroundColor="white"
      >
        <Text variant="lgHeading" color="black">
          Settings
        </Text>
        <Button
          layout="textOnly"
          label="Accounts"
          variant="Primary"
          onPress={() => router.push("/settings/accounts")}
        />
        <Button
          layout="textOnly"
          label="Notification Preferences"
          variant="Primary"
          onPress={() => router.push("/settings/notifications")}
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
        <Button
          layout="textOnly"
          label="Delete Account"
          variant="Destructive"
          loading={isDeletePending}
          loadingLabel="Deleting account..."
          disabled={isDeletePending}
          onPress={() => deleteUserData({ userID: userId })}
        />
      </Box>
    </Screen>
  );
}
