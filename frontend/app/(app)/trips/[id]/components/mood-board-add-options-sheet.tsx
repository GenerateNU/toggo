import { Box, Text } from "@/design-system";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  Compass,
  Globe,
  Image as ImageIcon,
  Link2,
  Music2,
  PenLine,
  X,
} from "lucide-react-native";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type MoodBoardAddOptionsSheetHandle = {
  open: () => void;
  close: () => void;
};

type MoodBoardAddOptionsSheetProps = {
  categoryLabel: string;
  onAddLink: () => void;
  onAddImage: () => void;
  onAddNote: () => void;
};

/** Explicit snap is required: `snapToIndex(0)` does not open when only dynamic sizing is enabled. */
const SNAP_POINTS = ["48%"];

export const MoodBoardAddOptionsSheet = forwardRef<
  MoodBoardAddOptionsSheetHandle,
  MoodBoardAddOptionsSheetProps
>(({ categoryLabel, onAddLink, onAddImage, onAddNote }, ref) => {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const insets = useSafeAreaInsets();

  const runAfterClose = useCallback((action: () => void) => {
    sheetRef.current?.close();
    setTimeout(action, 320);
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.snapToIndex(0),
    close: () => sheetRef.current?.close(),
  }));

  return (
    <BottomSheetModal ref={sheetRef} snapPoints={SNAP_POINTS} disableScrollView>
      <Box
        paddingHorizontal="md"
        paddingTop="xl"
        style={{
          paddingBottom: Math.max(Layout.spacing.sm, insets.bottom),
        }}
      >
        <View style={styles.headerRow}>
          <Box flex={1} marginRight="sm" gap="xxs">
            <Text variant="headingSm" color="gray950">
              Add to {categoryLabel}
            </Text>
            <Text variant="bodySmDefault" color="gray500">
              Pull in content from anywhere
            </Text>
          </Box>
          <Pressable
            onPress={() => sheetRef.current?.close()}
            hitSlop={10}
            accessibilityLabel="Close"
          >
            <X size={22} color={ColorPalette.gray700} />
          </Pressable>
        </View>

        <Box gap="sm" marginTop="md">
          <Pressable
            onPress={() => runAfterClose(onAddLink)}
            accessibilityRole="button"
            accessibilityLabel="Add from link"
          >
            <View style={styles.optionRow}>
              <Link2 size={22} color={ColorPalette.gray900} />
              <Text
                variant="bodyDefault"
                color="gray950"
                style={styles.optionLabel}
              >
                Add from link
              </Text>
              <View style={styles.linkHints}>
                <Globe size={16} color={ColorPalette.brand500} />
                <Music2 size={16} color={ColorPalette.gray800} />
                <Compass size={16} color={ColorPalette.blue500} />
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => runAfterClose(onAddImage)}
            accessibilityRole="button"
            accessibilityLabel="Upload from device"
          >
            <View style={styles.optionRow}>
              <ImageIcon size={22} color={ColorPalette.gray900} />
              <Text
                variant="bodyDefault"
                color="gray950"
                style={styles.optionLabelSolo}
              >
                Upload from device
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => runAfterClose(onAddNote)}
            accessibilityRole="button"
            accessibilityLabel="Write a note"
          >
            <View style={styles.optionRow}>
              <PenLine size={22} color={ColorPalette.gray900} />
              <Text
                variant="bodyDefault"
                color="gray950"
                style={styles.optionLabelSolo}
              >
                Write a note
              </Text>
            </View>
          </Pressable>
        </Box>
      </Box>
    </BottomSheetModal>
  );
});

MoodBoardAddOptionsSheet.displayName = "MoodBoardAddOptionsSheet";

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.gray50,
    borderRadius: CornerRadius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  optionLabel: {
    flex: 1,
  },
  optionLabelSolo: {
    flex: 1,
  },
  linkHints: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
});
