import CompleteProfileForm from "@/app/(auth)/components/complete-profile-form";
import { BottomSheet, Box, ImagePicker, Text } from "@/design-system";
import { useState } from "react";

type CreateProfileSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  needsProfile: boolean;
  onSuccess: () => Promise<void>;
};

export function CreateProfileSheet({
  bottomSheetRef,
  needsProfile,
  onSuccess,
}: CreateProfileSheetProps) {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={["50%", "60%"]}
      initialIndex={needsProfile ? 0 : -1}
      disableClose={needsProfile}
    >
      <Box flex={1} padding="sm" gap="lg">
        <Text variant="bodyMedium" color="black">
          Create a profile
        </Text>
        <Box justifyContent="center" alignItems="center">
          <ImagePicker
            variant="circular"
            size={88}
            value={profilePhoto ?? undefined}
            onChange={(uri) => setProfilePhoto(uri)}
            placeholder="Add photo"
          />
        </Box>
        <CompleteProfileForm
          profilePhotoUri={profilePhoto}
          onSuccess={onSuccess}
        />
      </Box>
    </BottomSheet>
  );
}

export default CreateProfileSheet;
