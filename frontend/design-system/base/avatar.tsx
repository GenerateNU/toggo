import { Box } from "@/design-system/base/box";
import { useTheme } from "@shopify/restyle";
import { Image } from "expo-image";
import { Theme } from "../config/theme";

interface AvatarProps {
  profilePhoto: string | null;
  variant: "xsmall" | "small" | "medium" | "big" | "huge";
}

export const Avatar: React.FC<AvatarProps> = ({ profilePhoto, variant = "small" }) => {
  const theme = useTheme<Theme>();
  const variantStyle = theme.avatarVariants[variant];
  const profile = profilePhoto ? profilePhoto : "";

  return (
    <Box aspectRatio={1} width={variantStyle.size}>
      <Image
        className="w-full"
        style={{
          aspectRatio: 1,
          borderRadius: "100%",
        }}
        source={{
          uri: profile,
        }}
      />
    </Box>
  );
};