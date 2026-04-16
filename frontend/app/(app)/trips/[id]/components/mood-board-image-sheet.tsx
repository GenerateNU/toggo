import { useCreateActivity } from "@/api/activities";
import { Box, Button, Text, TextField, useToast } from "@/design-system";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { uploadGalleryImage } from "@/services/imageService";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus } from "lucide-react-native";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { assertMoodBoardActivityXor } from "./mood-board-utils";

export type MoodBoardImageSheetHandle = {
  open: () => void;
  close: () => void;
};

type MoodBoardImageSheetProps = {
  tripID: string;
  categoryName: string;
  onSaved: (activity: ModelsActivityAPIResponse) => void;
};

const PHOTO_TITLE = "Photo";

export const MoodBoardImageSheet = forwardRef<
  MoodBoardImageSheetHandle,
  MoodBoardImageSheetProps
>(({ tripID, categoryName, onSaved }, ref) => {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  /** Width / height from the picker asset (native dimensions). */
  const [pickedAspect, setPickedAspect] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const createActivity = useCreateActivity();
  const toast = useToast();
  const { width: windowWidth } = useWindowDimensions();

  const maxPreviewWidth = useMemo(
    () => windowWidth - Layout.spacing.sm * 2,
    [windowWidth],
  );

  const previewHeight = useMemo(() => {
    if (!pickedAspect || pickedAspect <= 0) {
      return maxPreviewWidth;
    }
    return maxPreviewWidth / pickedAspect;
  }, [maxPreviewWidth, pickedAspect]);

  useImperativeHandle(ref, () => ({
    open: () => {
      setLocalUri(null);
      setPickedAspect(null);
      setCaption("");
      sheetRef.current?.snapToIndex(0);
    },
    close: () => sheetRef.current?.close(),
  }));

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.show({ message: "Photo access is required." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setLocalUri(asset.uri);
      const w = asset.width ?? 0;
      const h = asset.height ?? 0;
      if (w > 0 && h > 0) {
        setPickedAspect(w / h);
      } else {
        setPickedAspect(null);
      }
    }
  };

  const handleSave = async () => {
    if (!localUri) return;
    let imageId: string;
    try {
      imageId = await uploadGalleryImage(localUri);
    } catch {
      toast.show({ message: "Upload failed. Try again." });
      return;
    }

    const payload = {
      name: PHOTO_TITLE,
      description: caption.trim() || undefined,
      image_ids: [imageId],
    };

    try {
      assertMoodBoardActivityXor("image", {
        name: payload.name,
        description: payload.description,
        image_ids: payload.image_ids,
      });
    } catch (e) {
      toast.show({ message: (e as Error).message });
      return;
    }

    try {
      const created = await createActivity.mutateAsync({
        tripID,
        data: {
          name: payload.name,
          description: payload.description,
          image_ids: payload.image_ids,
          category_names: [categoryName],
        },
      });
      sheetRef.current?.close();
      if (created) onSaved(created as ModelsActivityAPIResponse);
    } catch {
      toast.show({ message: "Could not save photo." });
    }
  };

  return (
    <BottomSheetModal ref={sheetRef}>
      <Box style={styles.header}>
        <Pressable onPress={() => sheetRef.current?.close()}>
          <Text variant="bodySmDefault" color="gray600">
            Cancel
          </Text>
        </Pressable>
        <Text variant="bodySmStrong" color="gray950">
          Add photo
        </Text>
        <Button
          layout="textOnly"
          label="Save"
          variant="Primary"
          disabled={!localUri || createActivity.isPending}
          loading={createActivity.isPending}
          onPress={handleSave}
        />
      </Box>
      <Box padding="sm" gap="md">
        <Pressable onPress={pickImage}>
          <Box
            borderRadius="md"
            borderWidth={1}
            borderColor="gray200"
            style={styles.preview}
            alignItems="center"
            justifyContent="center"
          >
            {localUri ? (
              <Image
                source={{ uri: localUri }}
                style={{
                  width: maxPreviewWidth,
                  height: previewHeight,
                }}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderInner}>
                <ImagePlus size={32} color={ColorPalette.gray400} />
                <Text variant="bodySmDefault" color="gray500">
                  Tap to choose a photo
                </Text>
              </View>
            )}
          </Box>
        </Pressable>
        <TextField
          label="Caption (optional)"
          placeholder="Add a short caption"
          value={caption}
          onChangeText={setCaption}
        />
      </Box>
    </BottomSheetModal>
  );
});

MoodBoardImageSheet.displayName = "MoodBoardImageSheet";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ColorPalette.gray100,
  },
  preview: {
    overflow: "hidden",
  },
  placeholderInner: {
    paddingVertical: Layout.spacing.xl,
    alignItems: "center",
    gap: Layout.spacing.xs,
    minHeight: 200,
    width: "100%",
  },
});
