import { Box, Text } from "@/design-system";
import OTPVerificationForm from "./components/verify-form";

export default function VerifyPage() {
  return (
    <Box backgroundColor="white" flex={1} justifyContent="center" padding="lg">
      <Text variant="lgHeading">Enter Verification Code</Text>
      <OTPVerificationForm />
    </Box>
  );
}
