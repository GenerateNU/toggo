import { useUploadImage } from "@/api/files/custom";
import { ConfirmSheet } from "@/app/(app)/components/confirm-sheet";
import { Box, Button, Text, useToast } from "@/design-system";
import BottomSheet from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily } from "@/design-system/tokens/typography";
import { getImageURL } from "@/services/imageService";
import * as ExpoImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import {
  forwardRef,
  ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ItemManualSheetBasePrefill = {
  name?: string;
  description?: string | undefined;
  thumbnailUri?: string | undefined;
};

export type ItemManualSheetBaseData = {
  name: string;
  description: string;
  thumbnailURL: string | undefined;
};

export type AddItemManualSheetHandle = {
  open: (prefill?: ItemManualSheetBasePrefill) => void;
  close: () => void;
};

type AddItemManualSheetProps<T> = {
  title: string;
  namePlaceholder?: string;
  saveLabel?: string;
  successMessage?: string;
  formRows?: ReactNode;
  onSave: (baseData: ItemManualSheetBaseData) => Promise<T>;
  onSaved: (result: T) => void;
  onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

function AddItemManualSheetInner<T>(
  {
    title,
    namePlaceholder = "New Item",
    saveLabel = "Save",
    successMessage = "Saved",
    formRows,
    onSave,
    onSaved,
    onClose,
  }: AddItemManualSheetProps<T>,
  ref: React.ForwardedRef<AddItemManualSheetHandle>,
) {
  const toast = useToast();
  const uploadImage = useUploadImage();
  const bottomSheetRef = useRef<any>(null);
  const savedRef = useRef(false);

  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (prefill) => {
      setName(prefill?.name ?? "");
      setDescription(prefill?.description ?? "");
      setThumbnailUri(prefill?.thumbnailUri ?? null);
      bottomSheetRef.current?.snapToIndex(0);
    },
    close: () => bottomSheetRef.current?.close(),
  }));

  const resetForm = () => {
    setName("");
    setDescription("");
    setThumbnailUri(null);
  };

  const handlePickImage = async () => {
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [346, 180],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setThumbnailUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let thumbnailURL: string | undefined;
      if (thumbnailUri?.startsWith("http")) {
        thumbnailURL = thumbnailUri;
      } else if (thumbnailUri) {
        try {
          const res = await uploadImage.mutateAsync({
            uri: thumbnailUri,
            sizes: ["medium"],
          });
          const urlRes = await getImageURL(res.imageId, "medium");
          thumbnailURL = urlRes.url;
        } catch {
          // non-blocking
        }
      }

      const result = await onSave({
        name: name.trim(),
        description: description.trim(),
        thumbnailURL,
      });

      toast.show({
        message: successMessage,
        action: { label: "View", onPress: () => {} },
      });
      savedRef.current = true;
      resetForm();
      onSaved(result);
    } catch {
      toast.show({ message: "Couldn't save. Try again." });
    } finally {
      setIsSaving(false);
    }
  };

  // Called when user taps X or dismisses the sheet
  const handleCancel = () => {
    if (savedRef.current) {
      savedRef.current = false;
      return;
    }
    const hasData = name.trim() || description.trim() || thumbnailUri;
    if (hasData) {
      setShowCancelConfirm(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const isValid = name.trim().length > 0;
  const itemLabel = name || "New Item";

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["90%"]}
        initialIndex={-1}
        onClose={handleCancel}
        footer={
          <Box style={styles.footer}>
            <Button
              layout="textOnly"
              label={saveLabel}
              variant="Primary"
              disabled={!isValid || isSaving}
              loading={isSaving}
              onPress={handleSave}
            />
            <Button
              layout="textOnly"
              label="Cancel"
              variant="Red"
              disabled={isSaving}
              onPress={handleCancel}
            />
          </Box>
        }
      >
        {/* Header */}
        <Box style={styles.header}>
          <Text variant="bodyMedium" color="gray950" style={styles.headerTitle}>
            {title}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={handleCancel}
            hitSlop={12}
          >
            <X size={20} color={ColorPalette.gray900} />
          </Pressable>
        </Box>

        <Box style={styles.content}>
          {/* Thumbnail */}
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
            <Box style={styles.thumbnailContainer}>
              {thumbnailUri ? (
                <Image
                  source={{ uri: thumbnailUri }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <ImagePlus size={24} color={ColorPalette.gray400} />
              )}
            </Box>
          </TouchableOpacity>

          {/* Name + description */}
          <Box style={styles.nameSection}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={namePlaceholder}
              placeholderTextColor={ColorPalette.gray400}
              style={styles.nameInput}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description"
              placeholderTextColor={ColorPalette.gray400}
              multiline
              style={styles.descriptionInput}
            />
          </Box>

          {formRows}
        </Box>
      </BottomSheet>

      {/* Cancel confirmation — only shown once, replaces the Dialog */}
      <ConfirmSheet
        visible={showCancelConfirm}
        title={`Cancel adding "${itemLabel}"?`}
        subtitle="You'll lose any additions you made"
        confirmLabel={`Delete "${itemLabel}"`}
        cancelLabel={`Keep "${itemLabel}"`}
        onConfirm={() => {
          setShowCancelConfirm(false);
          resetForm();
          onClose();
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </>
  );
}

export const AddItemManualSheet = forwardRef(AddItemManualSheetInner) as <T>(
  props: AddItemManualSheetProps<T> & {
    ref?: React.ForwardedRef<AddItemManualSheetHandle>;
  },
) => React.ReactElement;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: "relative",
  },
  headerTitle: {
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 16,
  },
  thumbnailContainer: {
    width: "100%",
    height: 180,
    borderRadius: CornerRadius.lg,
    backgroundColor: ColorPalette.gray50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  nameSection: {
    gap: 4,
  },
  nameInput: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    lineHeight: 24,
    color: ColorPalette.gray900,
    paddingVertical: 2,
  },
  descriptionInput: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 20,
    color: ColorPalette.gray500,
    paddingVertical: 2,
  },
  footer: {
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.md,
    paddingTop: Layout.spacing.xs,
    gap: Layout.spacing.xxs,
    backgroundColor: ColorPalette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.gray100,
  },
});
