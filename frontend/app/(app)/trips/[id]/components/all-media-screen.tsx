import { useUpdateActivity } from "@/api/activities";
import { useUploadImage } from "@/api/files/custom";
import { BackButton, Screen, Text, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import * as ExpoImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useState } from "react";

import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { ImageViewer } from "../media/image-viewer";
import { MediaPopover } from "../media/media-popover";
import { MediaTile } from "../media/media-tile";
import type { MediaItem } from "../media/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID_PADDING = Layout.spacing.sm;
const GRID_GAP = 8;
const NUM_COLUMNS = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

type AllMediaScreenProps = {
  tripID: string;
  entityID: string;
  entityName?: string;
  mediaItems: MediaItem[];
  existingImageIds: string[];
  onRefetch: () => void;
};

// ─── Add Tile ─────────────────────────────────────────────────────────────────

function AddTile({ size, onPress }: { size: number; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.addTile, { width: size, height: size }]}
      onPress={onPress}
    >
      <Text style={styles.addIcon}>+</Text>
    </Pressable>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AllMediaScreen({
  tripID,
  entityID,
  entityName,
  mediaItems,
  existingImageIds,
  onRefetch,
}: AllMediaScreenProps) {
  const toast = useToast();
  const uploadImage = useUploadImage();
  const updateActivity = useUpdateActivity();
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure actual container width so padding/safe areas are accounted for
  const tileSize =
    containerWidth > 0
      ? (containerWidth - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
        NUM_COLUMNS
      : 0;

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverX, setPopoverX] = useState(0);
  const [popoverY, setPopoverY] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedTileLayout, setSelectedTileLayout] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [_isUploading, setIsUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const handleLongPress = useCallback(
    (
      item: MediaItem,
      x: number,
      y: number,
      layout: { x: number; y: number },
    ) => {
      setSelectedItem(item);
      setSelectedTileLayout(layout);
      setPopoverX(x - 120);
      setPopoverY(y - 20);
      setPopoverVisible(true);
    },
    [],
  );

  const handleShare = useCallback(async () => {
    setPopoverVisible(false);
    if (!selectedItem) return;
    try {
      await Share.share({ message: selectedItem.url });
    } catch {
      toast.show({ message: "Couldn't share image." });
    }
  }, [selectedItem, toast]);

  const handleDelete = useCallback(async () => {
    setPopoverVisible(false);
    if (!selectedItem) return;
    const remainingIds = existingImageIds.filter(
      (id) => id !== selectedItem.imageId,
    );
    try {
      await updateActivity.mutateAsync({
        tripID,
        activityID: entityID,
        data: { image_ids: remainingIds },
      });
      onRefetch();
      toast.show({ message: "Image removed." });
    } catch {
      toast.show({ message: "Couldn't remove image. Try again." });
    }
  }, [
    selectedItem,
    tripID,
    entityID,
    existingImageIds,
    updateActivity,
    onRefetch,
    toast,
  ]);

  const handleAddImage = useCallback(async () => {
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setIsUploading(true);
    try {
      const res = await uploadImage.mutateAsync({
        uri: result.assets[0].uri,
        sizes: ["medium", "large"],
      });
      await updateActivity.mutateAsync({
        tripID,
        activityID: entityID,
        data: { image_ids: [...existingImageIds, res.imageId] },
      });
      onRefetch();
    } catch {
      toast.show({ message: "Couldn't upload image. Try again." });
    } finally {
      setIsUploading(false);
    }
  }, [
    tripID,
    entityID,
    existingImageIds,
    uploadImage,
    updateActivity,
    onRefetch,
    toast,
  ]);

  return (
    <Screen>
      <View style={styles.navBar}>
        <View style={styles.navSideButton}>
          <BackButton onPress={() => router.back()} />
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          {entityName ?? "Media"}
        </Text>
        <View style={styles.navSideButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {mediaItems.map((item, index) => (
          <MediaTile
            key={item.imageId}
            item={item}
            size={tileSize}
            isSelected={
              selectedItem?.imageId === item.imageId && popoverVisible
            }
            onPress={() => setViewerIndex(index)}
            onLongPress={(x, y, layout) => handleLongPress(item, x, y, layout)}
          />
        ))}
        <AddTile size={tileSize} onPress={handleAddImage} />
      </ScrollView>

      <MediaPopover
        visible={popoverVisible}
        x={popoverX}
        y={popoverY}
        onShare={handleShare}
        onDelete={handleDelete}
        selectedItem={selectedItem}
        selectedTileLayout={selectedTileLayout}
        onClose={() => {
          setPopoverVisible(false);
          setSelectedItem(null);
          setSelectedTileLayout(null);
        }}
      />

      {viewerIndex !== null && (
        <ImageViewer
          images={mediaItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: 12,
    backgroundColor: ColorPalette.white,
  },
  navSideButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    padding: GRID_PADDING,
    paddingTop: 12,
  },
  addTile: {
    backgroundColor: ColorPalette.gray50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  addIcon: {
    fontFamily: FontFamily.regular,
    fontSize: 28,
    color: ColorPalette.gray400,
  },
});
