import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import React from "react";
import { Modal, Pressable, TouchableOpacity } from "react-native";

const DIALOG_HORIZONTAL_PADDING = Layout.spacing.xl;
const DIALOG_BORDER_RADIUS = 20;

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
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: ColorPalette.backgroundOverlay,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: DIALOG_HORIZONTAL_PADDING,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: ColorPalette.white,
            borderRadius: DIALOG_BORDER_RADIUS,
            width: "100%",
          }}
        >
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

export default Dialog;
