import { Box, Logo, Screen, Text } from "@/design-system";
import PhoneNumberForm from "./components/login-form";

export default function PhonePage() {
  return (
    <Screen>
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
            <Logo size="xl" />
          </Box>
          <Text variant="bodyMedium" color="gray900">
            Enter your phone number
          </Text>
        </Box>

        <Box flex={1} gap="sm">
          <PhoneNumberForm />
        </Box>
      </Box>
    </Screen>
  );
}
