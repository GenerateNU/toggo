import { BottomSheet, Box, Button, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { X } from "lucide-react-native";
import { useState } from "react";
import { TouchableOpacity } from "react-native";

type DeleteAccountSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  onConfirm: (usernameInput: string) => void;
  onDismiss?: () => void;
};

export function DeleteAccountSheet({
  bottomSheetRef,
  onConfirm,
  onDismiss,
}: DeleteAccountSheetProps) {
  const [username, setUsername] = useState("");

  const handleNevermind = () => {
    setUsername("");
    bottomSheetRef.current?.close();
    onDismiss?.();
  };

  const handleConfirm = () => {
    onConfirm(username.trim());
  };

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onDismiss}>
      <Box paddingHorizontal="sm" paddingBottom="lg" gap="lg">
        <Box flexDirection="row" justifyContent="flex-end">
          <TouchableOpacity
            onPress={handleNevermind}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={24} color={ColorPalette.gray950} />
          </TouchableOpacity>
        </Box>

        <Box gap="xxs">
          <Text variant="headingMd" color="gray950">
            Input your username to delete your account
          </Text>
        </Box>

        <TextField
          placeholder="Enter username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Box gap="sm">
          <Button
            layout="textOnly"
            label="Delete Account"
            variant="Destructive"
            onPress={handleConfirm}
            disabled={username.trim().length === 0}
          />
          <Button
            layout="textOnly"
            label="Cancel"
            variant="Secondary"
            onPress={handleNevermind}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
}
