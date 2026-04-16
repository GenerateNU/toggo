import { useGetActivity, useUpdateActivity } from "@/api/activities";
import { useUploadImage } from "@/api/files/custom";
import { BackButton, Screen, Text, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import * as ExpoImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";

// ─── Shared media components ──────────────────────────────────────────────────
import { ImageViewer } from "../../media/image-viewer";
import { MediaPopover } from "../../media/media-popover";
import { MediaTile, TILE_SIZE } from "../../media/media-tile";
import type { MediaItem } from "../../media/types";

// ─── Add Tile ─────────────────────────────────────────────────────────────────

function AddTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={[styles.tile, styles.addTile]} onPress={onPress}>
      <Text style={styles.addIcon}>+</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AllMediaScreen() {
  const { id: activityID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();
  const toast = useToast();
  const uploadImage = useUploadImage();
  const updateActivity = useUpdateActivity();

  const { data: activity, refetch } = useGetActivity(tripID ?? "", activityID, {
    query: { enabled: !!(tripID && activityID) },
  });

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    if (activity?.thumbnail_url) {
      items.push({ imageId: "thumbnail", url: activity.thumbnail_url });
    }
    (activity?.image_ids ?? [])
      .filter(
        (img) => !!img.image_url && img.image_url !== activity?.thumbnail_url,
      )
      .forEach((img) =>
        items.push({ imageId: img.image_id!, url: img.image_url! }),
      );
    return items;
  }, [activity]);

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverX, setPopoverX] = useState(0);
  const [popoverY, setPopoverY] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedTileLayout, setSelectedTileLayout] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    if (!selectedItem || !tripID || !activityID || !activity) return;
    const remainingIds = (activity.image_ids ?? [])
      .filter((img) => img.image_id !== selectedItem.imageId)
      .map((img) => img.image_id!)
      .filter(Boolean);
    try {
      await updateActivity.mutateAsync({
        tripID,
        activityID,
        data: { image_ids: remainingIds },
      });
      refetch();
      toast.show({ message: "Image removed." });
    } catch {
      toast.show({ message: "Couldn't remove image. Try again." });
    }
  }, [
    selectedItem,
    tripID,
    activityID,
    activity,
    updateActivity,
    refetch,
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
      const existingIds = (activity?.image_ids ?? [])
        .map((img) => img.image_id!)
        .filter(Boolean);
      await updateActivity.mutateAsync({
        tripID: tripID!,
        activityID: activityID!,
        data: { image_ids: [...existingIds, res.imageId] },
      });
      refetch();
    } catch {
      toast.show({ message: "Couldn't upload image. Try again." });
    } finally {
      setIsUploading(false);
    }
  }, [
    activity,
    tripID,
    activityID,
    uploadImage,
    updateActivity,
    refetch,
    toast,
  ]);

  return (
    <Screen>
      <View style={styles.navBar}>
        <View style={styles.navSideButton}>
          <BackButton onPress={() => router.back()} />
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          {activity?.name ?? "Media"}
        </Text>
        <View style={styles.navSideButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {mediaItems.map((item, index) => (
          <MediaTile
            key={item.imageId}
            item={item}
            isSelected={
              selectedItem?.imageId === item.imageId && popoverVisible
            }
            onPress={() => setViewerIndex(index)}
            onLongPress={(x, y, layout) => handleLongPress(item, x, y, layout)}
          />
        ))}
        <AddTile onPress={handleAddImage} />
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
    gap: 8,
    padding: Layout.spacing.sm,
    paddingTop: 12,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
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
