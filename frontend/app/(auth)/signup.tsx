import { Box } from "@/design-system/base/box";
import { Button } from "@/design-system/base/button";
import { Text } from "@/design-system/base/text";
import { useRouter } from "expo-router";
import { SignupForm } from "./components/signup-form";

export default function SignupPage() {
  const router = useRouter();

  return (
    <Box flex={1} justifyContent="center" padding="l">
      <Text variant="bodyLargeBold" mb="l">
        Create your account
      </Text>
      <SignupForm />
      
      <Box mt="l" alignItems="center" gap="xs">
        <Text variant="caption" color="forestGreen">
          Already have an account?
        </Text>
        <Button
          onPress={() => router.push("/(auth)/login")}
          style={{ backgroundColor: "transparent" }}
        >
          <Text variant="caption" color="forestGreen">
            Login here
          </Text>
        </Button>
      </Box>
    </Box>
  );
}
