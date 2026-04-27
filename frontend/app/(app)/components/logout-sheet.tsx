import { BottomSheet, Box, Button, Text } from "@/design-system";

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
    <BottomSheet disableScrollView ref={bottomSheetRef} onClose={onDismiss} snapPoints={[300]}>
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="lg" gap="lg">
        <Box gap="xxs">
          <Text variant="bodyLargeStrong" color="gray950">
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
