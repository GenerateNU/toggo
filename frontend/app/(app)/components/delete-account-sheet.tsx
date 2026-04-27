import { BottomSheet, Box, Button, Text, TextField } from "@/design-system";
import { useState } from "react";

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
    <BottomSheet disableScrollView ref={bottomSheetRef} onClose={onDismiss} snapPoints={[400]}>
      <Box paddingTop="sm" paddingBottom="lg" paddingHorizontal="sm" gap="lg">
        <Box gap="xxs">
          <Text variant="bodyLargeStrong" color="gray950">
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
