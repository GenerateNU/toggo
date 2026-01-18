import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { OTPVerificationForm } from "./components/verify-form";

export default function VerifyPage() {
  return (
    <Box
      flex={1}
      backgroundColor="cloudWhite"
      justifyContent="center"
      padding="l"
    >
      <Text variant="h1">Enter Verification Code</Text>

      <OTPVerificationForm />
    </Box>
  );
}
