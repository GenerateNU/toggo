import { Box, Button, Divider, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { Typography } from "@/design-system/tokens/typography";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Image } from "expo-image";
import { ImagePlus, Link, Mic, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";
import { PitchContentSections } from "../../components/pitch-content-sections";
import type { RecordingResult } from "./audio-pitch-sheet";

const DESCRIPTION_BASE_HEIGHT = Typography.bodyXsDefault.lineHeight;

function getLinkDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch {
    return "";
  }
}

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
  formTitle?: string;
  submitLabel?: string;
  cancelLabel?: string;
  requireRecordingForSubmit?: boolean;
  locationEditable?: boolean;
  imageEditable?: boolean;
  audioEditable?: boolean;
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
  formTitle = "Add new pitch",
  submitLabel = "Submit pitch",
  cancelLabel = "Cancel",
  requireRecordingForSubmit = true,
  locationEditable = true,
  imageEditable = true,
  audioEditable = true,
}: CreatePitchFormSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const isProgrammaticCloseRef = useRef(false);
  const [descriptionValue, setDescriptionValue] = useState(description);
  const [descriptionHeight, setDescriptionHeight] = useState<number>(
    DESCRIPTION_BASE_HEIGHT,
  );

  useEffect(() => {
    if (visible) {
      isProgrammaticCloseRef.current = false;
      sheetRef.current?.snapToIndex(0);
    } else {
      isProgrammaticCloseRef.current = true;
      sheetRef.current?.close();
    }
  }, [visible]);

  useEffect(() => {
    setDescriptionValue(description);
  }, [description]);

  const handleClose = () => {
    setDescriptionHeight(DESCRIPTION_BASE_HEIGHT);
    if (isProgrammaticCloseRef.current) {
      isProgrammaticCloseRef.current = false;
      return;
    }
    onCancel();
  };

  const handleSubmit = () => {
    onChangeTitle(title);
    onChangeDescription(descriptionValue);
    onSubmit();
  };

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["92%"]}
      initialIndex={-1}
      hideHandle={true}
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
            label={submitLabel}
            variant="Primary"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || (requireRecordingForSubmit && !recording)}
          />
          <Button
            layout="textOnly"
            label={cancelLabel}
            variant="Red"
            onPress={onCancel}
            disabled={isSubmitting}
          />
        </Box>
      }
    >
      <Box backgroundColor="white" paddingHorizontal="sm" paddingTop="sm">
        <Text
          variant="headingSm"
          color="gray900"
          textAlign="center"
          marginBottom="sm"
        >
          {formTitle}
        </Text>

        <Pressable onPress={imageEditable ? onPickImage : undefined}>
          <Box style={styles.heroImageBox}>
            {imageUri ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
                {imageEditable ? (
                  <Pressable
                    onPress={onRemoveImage}
                    style={styles.photoRemoveBtn}
                    hitSlop={8}
                  >
                    <X size={14} color={ColorPalette.white} />
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Box alignItems="center" gap="xs">
                <ImagePlus size={28} color={ColorPalette.gray500} />
                <Text variant="bodyXsDefault" color="gray500">
                  Add media
                </Text>
              </Box>
            )}
          </Box>
        </Pressable>

        <Box paddingTop="sm" gap="xs">
          <Pressable
            onPress={locationEditable ? onChangeLocation : undefined}
            hitSlop={8}
          >
            <Box flexDirection="row" alignItems="center" gap="xxs">
              <Text
                variant="headingSm"
                color="gray900"
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {title || selectedLocationLabel}
              </Text>
            </Box>
          </Pressable>

          <TextInput
            value={descriptionValue}
            onChangeText={(value) => {
              setDescriptionValue(value);
              onChangeDescription(value);
            }}
            onContentSizeChange={(event) => {
              const contentHeight = event.nativeEvent.contentSize.height;
              const nextHeight = Math.max(
                DESCRIPTION_BASE_HEIGHT,
                Math.ceil(contentHeight),
              );
              setDescriptionHeight((prevHeight) =>
                Math.abs(prevHeight - nextHeight) > 1 ? nextHeight : prevHeight,
              );
            }}
            placeholder="Add a description"
            placeholderTextColor={ColorPalette.gray400}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            style={[styles.descriptionInput, { height: descriptionHeight }]}
          />
        </Box>

        {!recording || !links.length ? (
          <Box>
            {!recording && audioEditable && (
              <Divider
                color={ColorPalette.gray100}
                style={{ marginTop: 4, marginBottom: 6 }}
              />
            )}

            {!recording && audioEditable ? (
              <Pressable onPress={onOpenAudio}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                  paddingVertical="xxs"
                >
                  <Box style={styles.actionIconBox}>
                    <Mic size={16} color={ColorPalette.gray500} />
                  </Box>
                  <Text
                    variant="bodySmMedium"
                    color="blue500"
                    style={{ flex: 1 }}
                  >
                    Add Audio Pitch
                  </Text>
                </Box>
              </Pressable>
            ) : null}

            {!links.length ? (
              <Pressable onPress={onOpenLinks}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                  paddingVertical="xxs"
                >
                  <Box style={styles.actionIconBox}>
                    <Link size={16} color={ColorPalette.gray500} />
                  </Box>
                  <Text
                    variant="bodySmMedium"
                    color="blue500"
                    style={{ flex: 1 }}
                  >
                    Links
                  </Text>
                </Box>
              </Pressable>
            ) : null}
          </Box>
        ) : null}

        {(recording || links.length > 0) && (
          <PitchContentSections
            audioUrl={recording?.uri}
            audioPitchId={
              recording
                ? `draft-${selectedLocationLabel}-${recording.durationSeconds}`
                : undefined
            }
            onEditAudio={recording && audioEditable ? onOpenAudio : undefined}
            links={links.map((url, index) => ({
              id: `${index}-${url}`,
              url,
              title: url,
              domain: getLinkDomain(url),
              onRemove: () => onRemoveLink(index),
            }))}
            onAddMoreLinks={links.length > 0 ? onOpenLinks : undefined}
          />
        )}
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
  descriptionInput: {
    fontSize: Typography.bodyXsDefault.fontSize,
    lineHeight: Typography.bodyXsDefault.lineHeight,
    color: ColorPalette.gray700,
    paddingVertical: 0,
    marginBottom: 0,
  },
  actionIconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
