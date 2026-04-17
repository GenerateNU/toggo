import { Pressable } from "react-native";
import { Box } from "../../primitives/box";
import { BorderWidth } from "../../tokens/border";
import { CoreSizeKey } from "../../tokens/core-size";
import { Avatar } from "../avatars/avatar";

export type ProfileAvatarButtonProps = {
  profilePhoto?: string | null;
  seed?: string;
  onPress: () => void;
  size?: CoreSizeKey;
  accessibilityLabel: string;
};

/**
 * Circular profile control for nav bars. Presentational only — wire `onPress` and URIs from app hooks.
 */
export function ProfileAvatarButton({
  profilePhoto,
  seed,
  onPress,
  size = "lg",
  accessibilityLabel,
}: ProfileAvatarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Box
        borderRadius="full"
        borderWidth={BorderWidth.hairline}
        borderColor="gray100"
        backgroundColor="white"
        padding="xxs"
        alignSelf="flex-start"
      >
        <Avatar
          profilePhoto={profilePhoto ?? undefined}
          seed={seed}
          variant={size}
        />
      </Box>
    </Pressable>
  );
}
