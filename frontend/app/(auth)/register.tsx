import { Link } from "expo-router";
import { useUser } from "@/contexts/user";
import { RegisterForm } from "./components/register-form";
import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { Button } from "@/design-system/base/button";

export default function Register() {
  const { register, isPending } = useUser();

  return (
    <Box flex={1} justifyContent="center" padding="l">
      <Text variant="h1" mb="l">
        Register
      </Text>

      <RegisterForm onSubmit={register} isPending={isPending} />

      <Link href="/(auth)/login" asChild>
        <Button variant="secondary" marginTop="m">
          <Text variant="caption" color="cloudWhite">
            Have an account? Login
          </Text>
        </Button>
      </Link>
    </Box>
  );
}
