import { Box, Button, Illustration, Logo } from "@/design-system";
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
  );
}
