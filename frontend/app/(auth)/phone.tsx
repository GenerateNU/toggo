import { Box, Logo, Text } from "@/design-system";
import PhoneNumberForm from "./components/login-form";

export default function PhonePage() {
  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="space-between"
      padding="lg"
      paddingBottom="xl"
      gap="xs"
    >
      <Box gap="xs">
        <Box width="auto" justifyContent="center" alignItems="center">
          <Logo />
        </Box>
        <Text variant="mdLabel" color="textSecondary">
          Enter your phone number
        </Text>
      </Box>
      
      <Box flex={1} gap="sm">
        <PhoneNumberForm />
      </Box>
    </Box>
  );
}
