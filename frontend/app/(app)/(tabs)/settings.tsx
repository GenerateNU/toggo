import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { Button } from "@/design-system/base/button";

export default function Settings() {
  const { logout, email, isPending } = useUser();

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="l"
      gap="l"
    >
      <Box alignItems="center">
        <Text variant="caption" color="forestGreen">
          Logged in as
        </Text>
        <Text variant="caption" mt="xs">
          {email}
        </Text>
      </Box>

      <Button onPress={logout} disabled={isPending} variant="secondary">
        <Text variant="caption" color="cloudWhite">
          Logout
        </Text>
      </Button>
    </Box>
  );
}
