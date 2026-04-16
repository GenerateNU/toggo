import { BottomSheet, Box, Button, Text } from "@/design-system";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ConfirmSheet({
  visible,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={[280]}
      initialIndex={-1}
      onChange={(index) => {
        if (index < 0) onCancel();
      }}
    >
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="xl" gap="sm">
        <Box gap="xxs">
          <Text variant="headingMd" color="gray950">
            {title}
          </Text>
          <Text variant="bodyMedium" color="gray500">
            {subtitle}
          </Text>
        </Box>
        <Box gap="xs">
          <Button
            layout="textOnly"
            label={confirmLabel}
            variant="Destructive"
            onPress={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          />
          <Button
            layout="textOnly"
            label={cancelLabel}
            variant="Secondary"
            onPress={onCancel}
            disabled={isLoading}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
}
