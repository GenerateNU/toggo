import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { Image } from "expo-image";
import { Share2, Trash2 } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { TILE_SIZE } from "./media-tile";
import type { MediaItem } from "./types";

// ─── Component ───────────────────────────────────────────────────────────────

type MediaPopoverProps = {
  visible: boolean;
  x: number;
  y: number;
  onShare: () => void;
  onDelete: () => void;
  onClose: () => void;
  selectedItem: MediaItem | null;
  selectedTileLayout: { x: number; y: number } | null;
};

export function MediaPopover({
  visible,
  x,
  y,
  onShare,
  onDelete,
  onClose,
  selectedItem,
  selectedTileLayout,
}: MediaPopoverProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(0,0,0,0.4)" },
        ]}
        onPress={onClose}
      />

      {selectedItem && selectedTileLayout && (
        <View
          style={{
            position: "absolute",
            left: selectedTileLayout.x,
            top: selectedTileLayout.y,
            width: TILE_SIZE,
            height: TILE_SIZE,
            borderRadius: 12,
            overflow: "hidden",
            transform: [{ scale: 200 / TILE_SIZE }],
          }}
        >
          <Image
            source={{ uri: selectedItem.url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
      )}

      <View style={[styles.popover, { top: y, left: x }]}>
        <Pressable style={styles.popoverItem} onPress={onShare}>
          <Share2 size={16} color={ColorPalette.gray900} />
          <Text variant="bodyDefault" color="gray900">
            Share
          </Text>
        </Pressable>
        <Box style={styles.popoverDivider} />
        <Pressable style={styles.popoverItem} onPress={onDelete}>
          <Trash2 size={16} color={ColorPalette.statusError} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  popover: {
    position: "absolute",
    backgroundColor: ColorPalette.white,
    borderRadius: 14,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 13,
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ColorPalette.gray100,
    marginHorizontal: Layout.spacing.sm,
  },
  deleteText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: ColorPalette.statusError,
  },
});
