import { Box } from "@/design-system/primitives/box";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Icon } from "../icons/icon";

interface BackButtonProps {
  onPress?: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  const router = useRouter();

  return (
    <Box
      onTouchEnd={onPress ?? router.back}
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
    >
      <Icon icon={ArrowLeft} size="sm" color="black" />
    </Box>
  );
};
