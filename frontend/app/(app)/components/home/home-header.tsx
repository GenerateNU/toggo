import { Box, Button, Logo, ProfileAvatarButton } from "@/design-system";
import { Plus } from "lucide-react-native";

export type HomeHeaderProfileProps = {
  profilePhotoUri?: string | null;
  seed: string;
  profileAccessibilityLabel: string;
};

type HomeHeaderProps = HomeHeaderProfileProps & {
  onPressProfile: () => void;
  onPressCreateTrip: () => void;
};

export function HomeHeader({
  profilePhotoUri,
  seed,
  profileAccessibilityLabel,
  onPressProfile,
  onPressCreateTrip,
}: HomeHeaderProps) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingBottom="sm"
    >
      <Box width={40} alignItems="flex-start">
        <ProfileAvatarButton
          profilePhoto={profilePhotoUri}
          seed={seed}
          size="lg"
          accessibilityLabel={profileAccessibilityLabel}
          onPress={onPressProfile}
        />
      </Box>
      <Logo />
      <Box width={40} alignItems="flex-end">
        <Button
          layout="iconOnly"
          variant="IconSecondary"
          size="small"
          accessibilityLabel="Create a trip"
          icon={Plus}
          onPress={onPressCreateTrip}
        />
      </Box>
    </Box>
  );
}

export default HomeHeader;
