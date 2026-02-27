import {
  AvatarColorKey,
  AvatarColorVariants,
} from "@/design-system/components/avatars/color-variant";
import { Box } from "@/design-system/primitives/box";
import { CoreSizeKey } from "@/design-system/tokens/core-size";
import { Theme } from "@/design-system/tokens/theme";
import { useTheme } from "@shopify/restyle";
import { Image } from "expo-image";
import { User } from "lucide-react-native";
import React from "react";

interface AvatarProps {
  profilePhoto?: string;
  variant?: CoreSizeKey;
  seed?: string;
}

const AVATAR_KEYS = Object.keys(AvatarColorVariants) as AvatarColorKey[];

const getDeterministicColors = (seed?: string) => {
  const index = seed
    ? (() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = (hash * 31 + seed.charCodeAt(i)) % 1000000007;
        }
        return Math.abs(hash) % AVATAR_KEYS.length;
      })()
    : Math.floor(Math.random() * AVATAR_KEYS.length);

  const key = AVATAR_KEYS[index % AVATAR_KEYS.length]!;
  return AvatarColorVariants[key];
};

export const Avatar: React.FC<AvatarProps> = ({
  profilePhoto,
  variant = "md",
  seed,
}) => {
  const { coreSize } = useTheme<Theme>();

  const size = coreSize[variant as CoreSizeKey];
  const { background, icon: iconColor } = getDeterministicColors(seed);

  const renderContent = () => {
    if (profilePhoto) {
      return (
        <Image
          style={{ width: "100%", height: "100%", borderRadius: 999 }}
          source={{ uri: profilePhoto }}
        />
      );
    }

    return <User size={size * 0.6} color={iconColor} />;
  };

  return (
    <Box
      width={size}
      aspectRatio={1}
      justifyContent="center"
      alignItems="center"
      borderRadius="full"
      style={{ backgroundColor: background }}
    >
      {renderContent()}
    </Box>
  );
};
