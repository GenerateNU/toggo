import { Box } from "@/design-system/primitives/box";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Icon } from "../icons/icon";

interface BackButtonProps {
  onPress?: () => void;
  hasBackground?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  hasBackground = false,
}) => {
  const router = useRouter();

  return (
    <Box
      onTouchEnd={onPress ?? router.back}
      alignItems="center"
      justifyContent="center"
      width={44}
      height={44}
      borderRadius={hasBackground ? "md" : undefined}
      backgroundColor={hasBackground ? "white" : undefined}
    >
      <Icon icon={ArrowLeft} size="sm" color="black" />
    </Box>
  );
};
