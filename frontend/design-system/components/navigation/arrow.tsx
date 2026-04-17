import { Box } from "@/design-system/primitives/box";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";
import { Icon } from "../icons/icon";

interface BackButtonProps {
  onPress?: () => void;
  hasBackground?: boolean;
  color?: "black" | "white" | "gray500";
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  hasBackground = false,
  color = "gray500",
}) => {
  const router = useRouter();

  const handlePress = onPress ?? router.back;

  if (hasBackground) {
    return (
      <Pressable onPress={handlePress}>
        <Box
          alignItems="center"
          justifyContent="center"
          padding="xs"
          borderRadius="md"
          backgroundColor="white"
        >
          <Icon icon={ArrowLeft} size="sm" color={color} />
        </Box>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Icon icon={ArrowLeft} size="sm" color={color} />
    </Pressable>
  );
};
