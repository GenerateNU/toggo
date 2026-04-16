import { BottomSheet, Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";

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
      <Box style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Pressable
          style={[styles.confirmButton, isLoading && { opacity: 0.6 }]}
          onPress={onConfirm}
          disabled={isLoading}
        >
          <Text style={styles.confirmText}>
            {isLoading ? "Loading..." : confirmLabel}
          </Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      </Box>
    </BottomSheet>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    color: ColorPalette.gray950,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
    color: ColorPalette.gray500,
    marginTop: 6,
  },
  confirmButton: {
    backgroundColor: "#D80009",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  confirmText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.white,
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: ColorPalette.gray50,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  cancelText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
