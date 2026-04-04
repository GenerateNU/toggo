import { BottomSheet, Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { X } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

type LogoutSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  onConfirm: () => void;
  onDismiss?: () => void;
};

export function LogoutSheet({
  bottomSheetRef,
  onConfirm,
  onDismiss,
}: LogoutSheetProps) {
  const handleNevermind = () => {
    bottomSheetRef.current?.close();
    onDismiss?.();
  };

  return (
    <BottomSheet ref={bottomSheetRef} snapPoints={["35%"]} onClose={onDismiss}>
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="lg" gap="lg">
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
            Logout?
          </Text>
          <Text variant="bodyDefault" color="gray500">
            You will no longer receive notifications
          </Text>
        </Box>

        <Box gap="sm">
          <Button
            layout="textOnly"
            label="Logout"
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
