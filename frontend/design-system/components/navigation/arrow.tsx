import { Box } from "@/design-system/primitives/box";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Icon } from "../icons/icon";

interface BackButtonProps {
  onPress?: () => void;
  hasBackground?: boolean;
  color?: "black" | "white";
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  hasBackground = false,
  color = "black",
}) => {
  const router = useRouter();

  return (
    <Box
      onTouchEnd={onPress ?? router.back}
      alignItems="center"
      justifyContent="center"
      width={36}
      height={36}
      borderRadius={hasBackground ? "md" : undefined}
      backgroundColor={hasBackground ? "white" : undefined}
    >
      <Icon icon={ArrowLeft} size="sm" color={color} />
    </Box>
  );
};
