import { Box, Button, Illustration, Logo, Screen } from "@/design-system";
import { useRouter } from "expo-router";

export default function LoginPage() {
  const router = useRouter();

  return (
    <Screen>
      <Box
        flex={1}
        backgroundColor="backgroundCard"
        justifyContent="space-between"
        padding="lg"
        paddingBottom="xl"
      >
        <Box width="auto" justifyContent="center" alignItems="center">
          <Logo />
        </Box>

        <Box width="auto" justifyContent="center" alignItems="center">
          <Illustration />
        </Box>

        <Button
          layout="textOnly"
          label="Log in or create an account"
          variant="Primary"
          onPress={() => router.push("/(auth)/phone")}
        />
      </Box>
    </Screen>
  );
}
