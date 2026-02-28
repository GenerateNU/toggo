import { Box } from "@/design-system/primitives/box";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";

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
      <ChevronLeft size={32} color="#000" />
    </Box>
  );
};
