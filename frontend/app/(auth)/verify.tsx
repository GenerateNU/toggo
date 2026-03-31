import { Box, Logo, Screen, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";
import OTPVerificationForm from "./components/verify-form";

export default function VerifyPage() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  return (
    <Screen>
      <Box
        flex={1}
        backgroundColor="backgroundCard"
        justifyContent="space-between"
        padding="lg"
        gap="sm"
      >
        <Box gap="xs">
          <Box width="auto" justifyContent="center" alignItems="center">
            <Logo />
          </Box>
          <Text variant="bodyMedium" color="textInverse">
            Enter Verification Code
          </Text>
          {phone && (
            <Text variant="bodySmDefault" color="textInverse">
              We have sent the code to {phone}
            </Text>
          )}
        </Box>

        <Box flex={1} justifyContent="center">
          <OTPVerificationForm />
        </Box>
      </Box>
    </Screen>
  );
}
