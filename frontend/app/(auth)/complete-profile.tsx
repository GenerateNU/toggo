import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";
import { CompleteProfileForm } from "./components/complete-profile-form";

export default function CompleteProfilePage() {
  return (
    <Box flex={1} justifyContent="center" padding="l" gap="m">
      <Text variant="h1">Create Your Account</Text>
      <Text variant="body" color="mountainGray">
        We verified your phone. Finish setting up your profile.
      </Text>
      <CompleteProfileForm />
    </Box>
  );
}
