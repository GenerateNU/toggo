import { BottomSheet, Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { X } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

type DeleteAccountSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  onConfirm: () => void;
  onDismiss?: () => void;
};

export function DeleteAccountSheet({
  bottomSheetRef,
  onConfirm,
  onDismiss,
}: DeleteAccountSheetProps) {
  const handleNevermind = () => {
    bottomSheetRef.current?.close();
    onDismiss?.();
  };

  return (
    <BottomSheet ref={bottomSheetRef} snapPoints={["45%"]} onClose={onDismiss}>
      <Box paddingHorizontal="sm" paddingBottom="lg" gap="lg">
        <Box flexDirection="row" justifyContent="flex-end">
          <TouchableOpacity
            onPress={handleNevermind}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={ColorPalette.gray950} />
          </TouchableOpacity>
        </Box>

        <Box gap="xxs">
          <Text variant="headingMd" color="gray950">
            Delete Account?
          </Text>
          <Text variant="bodyDefault" color="gray500">
            This will permanently delete your account and all your data. This
            cannot be undone.
          </Text>
        </Box>

        <Box gap="sm">
          <Button
            layout="textOnly"
            label="Delete Account"
            variant="Destructive"
            onPress={onConfirm}
          />
          <Button
            layout="textOnly"
            label="Nevermind"
            variant="Secondary"
            onPress={handleNevermind}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
}
