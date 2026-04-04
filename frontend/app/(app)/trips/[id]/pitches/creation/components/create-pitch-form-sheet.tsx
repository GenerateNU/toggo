import { Box, Button, Divider, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { Typography } from "@/design-system/tokens/typography";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import type { RecordingResult } from "./audio-pitch-sheet";
import { CheckCircle, ImagePlus, Link, Mic, X } from "lucide-react-native";
import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

interface CreatePitchFormSheetProps {
  visible: boolean;
  insetsBottom: number;
  selectedLocationLabel: string;
  title: string;
  description: string;
  imageUri: string | null;
  recording: RecordingResult | null;
  links: string[];
  isSubmitting: boolean;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onChangeLocation: () => void;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onOpenAudio: () => void;
  onOpenLinks: () => void;
  onRemoveLink: (index: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function CreatePitchFormSheet({
  visible,
  insetsBottom,
  selectedLocationLabel,
  title,
  description,
  imageUri,
  recording,
  links,
  isSubmitting,
  onPickImage,
  onRemoveImage,
  onChangeLocation,
  onChangeTitle,
  onChangeDescription,
  onOpenAudio,
  onOpenLinks,
  onRemoveLink,
  onSubmit,
  onCancel,
}: CreatePitchFormSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const isProgrammaticCloseRef = useRef(false);
  const titleDraftRef = useRef(title);
  const descriptionDraftRef = useRef(description);

  useEffect(() => {
    if (visible) {
      isProgrammaticCloseRef.current = false;
      sheetRef.current?.snapToIndex(0);
    } else {
      isProgrammaticCloseRef.current = true;
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleClose = () => {
    if (isProgrammaticCloseRef.current) {
      isProgrammaticCloseRef.current = false;
      return;
    }
    onCancel();
  };

  const handleSubmit = () => {
    onChangeTitle(titleDraftRef.current);
    onChangeDescription(descriptionDraftRef.current);
    onSubmit();
  };

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["88%"]}
      initialIndex={-1}
      onClose={handleClose}
      footer={
        <Box
          backgroundColor="white"
          paddingHorizontal="sm"
          paddingTop="sm"
          gap="xs"
          style={{
            paddingBottom: Math.max(insetsBottom, 16),
            borderTopWidth: 1,
            borderTopColor: ColorPalette.gray100,
          }}
        >
          <Button
            layout="textOnly"
            label="Submit pitch"
            variant="Primary"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !recording}
          />
          <Button
            layout="textOnly"
            label="Cancel"
            variant="Red"
            onPress={onCancel}
            disabled={isSubmitting || !recording}
          />
        </Box>
      }
    >
      <Box backgroundColor="white" paddingHorizontal="sm" paddingTop="sm">
        <Text
          variant="bodyMedium"
          color="gray900"
          textAlign="center"
          marginBottom="sm"
        >
          Add new pitch
        </Text>

        <Pressable onPress={onPickImage}>
          <Box style={styles.heroImageBox}>
            {imageUri ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
                <Pressable
                  onPress={onRemoveImage}
                  style={styles.photoRemoveBtn}
                  hitSlop={8}
                >
                  <X size={14} color={ColorPalette.white} />
                </Pressable>
              </>
            ) : (
              <ImagePlus size={28} color={ColorPalette.gray500} />
            )}
          </Box>
        </Pressable>

        <Box paddingTop="sm" gap="xs">
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text variant="bodyXsDefault" color="gray500">
              {selectedLocationLabel}
            </Text>
            <Pressable onPress={onChangeLocation}>
              <Text variant="bodyXsMedium" color="brand500">
                Change location
              </Text>
            </Pressable>
          </Box>

          <TextInput
            defaultValue={title}
            onChangeText={(value) => {
              titleDraftRef.current = value;
            }}
            onBlur={() => onChangeTitle(titleDraftRef.current)}
            placeholder="Add title"
            placeholderTextColor={ColorPalette.gray400}
            style={styles.titleInput}
          />

          <TextInput
            defaultValue={description}
            onChangeText={(value) => {
              descriptionDraftRef.current = value;
            }}
            onBlur={() => onChangeDescription(descriptionDraftRef.current)}
            placeholder="Add a description"
            placeholderTextColor={ColorPalette.gray400}
            multiline
            textAlignVertical="top"
            style={styles.descriptionInput}
          />
        </Box>

        <Divider style={{ marginVertical: 6 }} />

        <Pressable onPress={onOpenAudio}>
          <Box
            flexDirection="row"
            alignItems="center"
            gap="sm"
            paddingVertical="xs"
          >
            <Mic
              size={18}
              color={recording ? ColorPalette.gray950 : ColorPalette.gray500}
            />
            <Text
              variant="bodySmMedium"
              color={recording ? "gray950" : "gray500"}
              style={{ flex: 1 }}
            >
              Audio Pitch
            </Text>
            {recording ? (
              <Box flexDirection="row" alignItems="center" gap="xs">
                <Text variant="bodyXsDefault" color="gray500">
                  {recording.durationSeconds}s
                </Text>
                <CheckCircle size={16} color={ColorPalette.brand500} />
              </Box>
            ) : null}
          </Box>
        </Pressable>

        <Pressable onPress={onOpenLinks}>
          <Box
            flexDirection="row"
            alignItems="center"
            gap="sm"
            paddingVertical="sm"
          >
            <Link size={18} color={ColorPalette.gray500} />
            <Text variant="bodySmMedium" color="gray500" style={{ flex: 1 }}>
              Links
            </Text>
            {links.length > 0 && (
              <Text variant="bodyXsDefault" color="gray500">
                {links.length}
              </Text>
            )}
          </Box>
        </Pressable>

        {links.map((url, i) => (
          <Box
            key={i}
            flexDirection="row"
            alignItems="center"
            gap="xs"
            paddingVertical="xs"
            paddingLeft="lg"
          >
            <Text
              variant="bodyXsDefault"
              color="brand500"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {url}
            </Text>
            <Pressable onPress={() => onRemoveLink(i)} hitSlop={8}>
              <X size={14} color={ColorPalette.gray400} />
            </Pressable>
          </Box>
        ))}

        {links.length > 0 && <Divider />}

        <Box height={140} />
      </Box>
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  heroImageBox: {
    height: 220,
    borderRadius: 16,
    backgroundColor: ColorPalette.gray100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleInput: {
    fontSize: Typography.bodySmStrong.fontSize,
    fontWeight: "600",
    color: ColorPalette.gray900,
    paddingVertical: 0,
    marginTop: 2,
  },
  descriptionInput: {
    fontSize: Typography.bodyXsDefault.fontSize,
    color: ColorPalette.gray700,
    minHeight: 40,
    paddingVertical: 0,
    marginBottom: 0,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: ColorPalette.gray50,
  },
});
