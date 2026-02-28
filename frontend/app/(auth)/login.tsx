import { Box, Text } from "@/design-system";
import PhoneNumberForm from "./components/login-form";

export default function PhoneNumberPage() {
  return (
    <Box backgroundColor="white" flex={1} justifyContent="center" padding="lg">
      <Text variant="smDisplay" mb="lg">
        Continue with phone
      </Text>
      <PhoneNumberForm />
    </Box>
  );
}
