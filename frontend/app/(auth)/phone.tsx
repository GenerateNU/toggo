import { Box, Text } from "@/design-system";
import PhoneNumberForm from "./components/login-form";

export default function PhonePage() {
  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="space-between"
      padding="lg"
      paddingBottom="xl"
    >
      <Box gap="xs" paddingTop="xl">
        <Text variant="logoXxl" color="textSecondary">
          TOGGO
        </Text>
        <Text variant="xxlHeading" color="textSecondary" marginTop="lg">
          Enter your phone number
        </Text>
        <Text variant="mdParagraph" color="textQuaternary">
          We'll send you a verification code.
        </Text>
      </Box>

      <Box flex={1} justifyContent="center">
        <PhoneNumberForm />
      </Box>
    </Box>
  );
}
