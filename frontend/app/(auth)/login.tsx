import { Link } from "expo-router";
import { useUser } from "@/contexts/user";
import { LoginForm } from "./components/login-form";
import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { Button } from "@/design-system/base/button";

export default function Login() {
  const { login, isPending } = useUser();

  return (
    <Box flex={1} justifyContent="center" padding="l">
      <Text variant="h1" mb="l">
        Login
      </Text>

      <LoginForm onSubmit={login} isPending={isPending} />

      <Link href="/(auth)/register" asChild>
        <Button variant="secondary" marginTop="m">
          <Text variant="caption" color="cloudWhite">
            Don't have an account? Register
          </Text>
        </Button>
      </Link>
    </Box>
  );
}
