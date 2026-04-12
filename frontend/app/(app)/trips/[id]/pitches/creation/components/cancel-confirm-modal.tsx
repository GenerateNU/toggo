import { Box, Button, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CancelConfirmModalProps {
  visible: boolean;
  pitchTitle: string;
  onKeep: () => void;
  onDelete: () => void;
}

export function CancelConfirmModal({
  visible,
  pitchTitle,
  onKeep,
  onDelete,
}: CancelConfirmModalProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const { bottom } = useSafeAreaInsets();
  const label = pitchTitle.trim() || "New Pitch";

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
      snapPoints={["25%"]}
      initialIndex={-1}
      hideHandle={true}
      onClose={onKeep}
    >
      <Box
        backgroundColor="white"
        gap="md"
        paddingHorizontal="md"
        paddingTop="sm"
        style={{ paddingBottom: Math.max(bottom, 16) }}
      >
        <Box gap="xs">
          <Text variant="headingSm" color="gray900">
            Cancel Adding "{label}"?
          </Text>
          <Text variant="bodySmDefault" color="gray500">
            You'll lose any additions you made
          </Text>
        </Box>

        <Box gap="xs">
          <Button
            layout="textOnly"
            label={`Delete "${label}"`}
            variant="Destructive"
            onPress={onDelete}
          />
          <Button
            layout="textOnly"
            label={`Keep editing "${label}"`}
            variant="Secondary"
            onPress={onKeep}
          />
        </Box>
      </Box>
    </BottomSheetComponent>
  );
}
