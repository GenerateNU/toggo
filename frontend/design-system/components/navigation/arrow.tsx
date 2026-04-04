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
      alignItems="center"
      justifyContent="center"
      style={{ width: 36, height: 36 }}
    >
      <Icon icon={ArrowLeft} size="sm" color="black" />
    </Box>
  );
};
