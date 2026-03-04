import { Box, ImagePicker, Text } from "@/design-system";
import { useState } from "react";
import CompleteProfileForm from "./components/complete-profile-form";

export default function CompleteProfilePage() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  return (
    <Box flex={1} backgroundColor="white" padding="lg" paddingBottom="xl">
      <Box gap="xs" paddingTop="xl">
        <Text variant="logoXxl" color="textSecondary">
          TOGGO
        </Text>
        <Text variant="xxlHeading" color="textSecondary" marginTop="lg">
          Create a profile
        </Text>
        <Text variant="mdParagraph" color="textQuaternary">
          You're almost there! Set up your profile to get started.
        </Text>
      </Box>

      <Box flex={1} justifyContent="center" alignItems="center" gap="lg">
        <ImagePicker
          variant="circular"
          size={88}
          value={profilePhoto ?? undefined}
          onChange={(uri) => setProfilePhoto(uri)}
          placeholder="Add photo"
        />
        <Box width="100%">
          <CompleteProfileForm profilePhotoUri={profilePhoto} />
        </Box>
      </Box>
    </Box>
  );
}
