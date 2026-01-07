import { useUser } from "@/contexts/user";
import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";

export default function Home() {
  const { logout, isPending } = useUser();
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="l"
      gap="m"
    >
      <Text variant="bodyLargeBold">Welcome to Toggo ✨</Text>
      <Text variant="caption" color="forestGreen">
        Cool things will appear here soon!
      </Text>

      <Button onPress={logout} disabled={isPending} variant="secondary">
        <Text variant="caption" color="cloudWhite">
          Logout
        </Text>
      </Button>
    </Box>
  );
}
