import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { PhoneNumberForm } from "./components/login-form";

export default function PhoneNumberPage() {
  return (
    <Box flex={1} backgroundColor="cloudWhite" justifyContent="center" padding="l">
      <Text variant="bodyLargeBold" mb="l">
        Login with phone number
      </Text>
      <PhoneNumberForm />
    </Box>
  );
}
