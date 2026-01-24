import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { PhoneNumberForm } from "./components/login-form";

export default function PhoneNumberPage() {
  return (
    <Box flex={1} justifyContent="center" padding="l">
      <Text variant="bodyLargeBold" mb="l">
        Continue with phone
      </Text>
      <PhoneNumberForm />
    </Box>
  );
}
