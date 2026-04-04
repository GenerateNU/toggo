
import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { LucideProps } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";

type FormRowProps = {
  icon: React.ComponentType<LucideProps>;
  value?: string;
  placeholder: string;
  onPress?: () => void;
};

export function FormRow({ icon: Icon, value, placeholder, onPress }: FormRowProps) {
  const hasValue = !!value;
  return (
    <Pressable onPress={onPress}>
      <Box flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs">
        <Icon
          size={16}
          color={hasValue ? ColorPalette.gray700 : ColorPalette.gray400}
        />
        <Text
          variant="bodySmDefault"
          color={hasValue ? "gray900" : "gray400"}
          style={{ flex: 1 }}
        >
          {value ?? placeholder}
        </Text>
      </Box>
    </Pressable>
  );
}