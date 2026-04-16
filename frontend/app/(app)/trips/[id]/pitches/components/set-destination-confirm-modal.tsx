import { Box, Button, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SetDestinationConfirmModalProps {
  visible: boolean;
  destinationName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SetDestinationConfirmModal({
  visible,
  destinationName,
  onCancel,
  onConfirm,
}: SetDestinationConfirmModalProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const { bottom } = useSafeAreaInsets();
  const label = destinationName.trim() || "this destination";

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["28%"]}
      initialIndex={-1}
      onClose={onCancel}
      disableScrollView
    >
      <Box
        backgroundColor="white"
        gap="md"
        paddingHorizontal="md"
        paddingTop="sm"
        style={{ paddingBottom: Math.max(bottom, 16) }}
      >
        <Box gap="xs">
          <Text variant="bodyMedium" color="gray900">
            Set “{label}” as Destination?
          </Text>
          <Text variant="bodySmDefault" color="gray500">
            {label} will become your new destination.
          </Text>
        </Box>

        <Box gap="sm">
          <Button
            layout="textOnly"
            label="Set as Destination"
            variant="Blue"
            onPress={onConfirm}
          />
          <Button
            layout="textOnly"
            label="Cancel"
            variant="Secondary"
            onPress={onCancel}
          />
        </Box>
      </Box>
    </BottomSheetComponent>
  );
}
