import { Box, Button, Text } from "@/design-system";
import { useRouter } from "expo-router";

export default function LoginPage() {
  const router = useRouter();

  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="space-between"
      padding="lg"
      paddingBottom="xl"
    >
      <Box alignItems="center" paddingTop="xl">
        <Text variant="logoXxl" color="textSecondary">
          TOGGO
        </Text>
      </Box>

      <Box flex={1} justifyContent="center" alignItems="center">
        <Text variant="xxlHeading">🚌</Text>
      </Box>

      <Button
        layout="textOnly"
        label="Log in or create an account"
        variant="Primary"
        onPress={() => router.push("/(auth)/phone")}
      />
    </Box>
  );
}
