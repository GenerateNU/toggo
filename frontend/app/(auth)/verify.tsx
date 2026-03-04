import { Box, Logo, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";
import OTPVerificationForm from "./components/verify-form";

export default function VerifyPage() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="space-between"
      padding="lg"
      gap="sm"
    >
      <Box gap="xs">
        <Box width="auto" justifyContent="center" alignItems="center">
          <Logo />
        </Box>
        <Text variant="mdLabel" color="textSecondary">
          Enter Verification Code
        </Text>
        {phone && (
          <Text variant="smParagraph" color="black">
            We have sent the code to {phone}
          </Text>
        )}
      </Box>

      <Box flex={1} justifyContent="center">
        <OTPVerificationForm />
      </Box>
    </Box>
  );
}
