import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import React from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity } from "react-native";

export type DialogActionStyle = "default" | "destructive" | "navigate";

export interface DialogAction {
  label: string;
  onPress: () => void;
  style?: DialogActionStyle;
}

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: DialogAction[];
}

const ACTION_TEXT_COLOR: Record<DialogActionStyle, string> = {
  default: ColorPalette.gray900,
  destructive: ColorPalette.statusError,
  navigate: ColorPalette.blue500,
};

export function Dialog({
  visible,
  onClose,
  title,
  message,
  actions,
}: DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {(title || message) && (
            <Box
              paddingHorizontal="md"
              paddingTop="md"
              paddingBottom="sm"
              gap="xxs"
            >
              {title && (
                <Text variant="bodyMedium" color="gray900">
                  {title}
                </Text>
              )}
              {message && (
                <Text variant="bodySmDefault" color="gray500">
                  {message}
                </Text>
              )}
            </Box>
          )}

          <Box paddingHorizontal="md" paddingBottom="md" gap="xs">
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Box
                  backgroundColor="gray50"
                  borderRadius="lg"
                  paddingVertical="sm"
                  alignItems="center"
                >
                  <Text
                    variant="bodySmMedium"
                    style={{
                      color: ACTION_TEXT_COLOR[action.style ?? "default"],
                    }}
                  >
                    {action.label}
                  </Text>
                </Box>
              </TouchableOpacity>
            ))}
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: ColorPalette.backgroundOverlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: ColorPalette.white,
    borderRadius: 20,
    width: "100%",
  },
});

export default Dialog;
