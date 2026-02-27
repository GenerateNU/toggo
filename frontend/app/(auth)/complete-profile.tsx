import { Box, Text } from "@/design-system";
import CompleteProfileForm from "./components/complete-profile-form";

export default function CompleteProfilePage() {
  return (
    <Box
      backgroundColor="white"
      flex={1}
      justifyContent="center"
      padding="lg"
      gap="md"
    >
      <Text variant="lgHeading">Create Your Account</Text>
      <Text variant="smDisplay" color="brandAccent">
        We verified your phone. Finish setting up your profile.
      </Text>
      <CompleteProfileForm />
    </Box>
  );
}
