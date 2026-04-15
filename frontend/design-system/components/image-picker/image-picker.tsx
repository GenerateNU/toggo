import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Icon } from "@/design-system/components/icons/icon";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import type { ColorName } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ExpoImagePicker from "expo-image-picker";
import {
  ImagePlus,
  Images,
  Image as LucideImage,
  Trash2,
  Upload,
  X,
} from "lucide-react-native";
import React, { useCallback, useRef } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

export type ImagePickerVariant = "circular" | "rectangular";

export interface ImagePickerProps {
  value?: string;
  onChange?: (uri: string | null) => void;
  variant?: ImagePickerVariant;
  size?: number;
  width?: ViewStyle["width"];
  height?: number;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  showPlaceholderText?: boolean;
  showRemoveAction?: boolean;
  showUploadFromFilesAction?: boolean;
}

const PICKER_OPTIONS: ExpoImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

let isPickerActive = false;

async function withPickerGuard<T>(
  fn: () => Promise<T>,
): Promise<T | undefined> {
  if (isPickerActive) return undefined;
  isPickerActive = true;
  try {
    return await fn();
  } finally {
    isPickerActive = false;
  }
}

interface ActionRowProps {
  icon: React.ComponentType<any>;
  label: string;
  onPress: () => void;
  color?: ColorName;
}

const ActionRow: React.FC<ActionRowProps> = ({
  icon,
  label,
  onPress,
  color = "gray600",
}) => (
  <Pressable onPress={onPress}>
    <Box flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs">
      <Icon icon={icon} size="sm" color={color} />
      <Text variant="bodyMedium" color={color}>
        {label}
      </Text>
    </Box>
  </Pressable>
);

export const ImagePicker: React.FC<ImagePickerProps> = ({
  value,
  onChange,
  variant = "circular",
  size = 88,
  width = "100%",
  height = 200,
  placeholder = "Add photo",
  disabled = false,
  title = "Add media",
  subtitle,
  showPlaceholderText = true,
  showRemoveAction = true,
  showUploadFromFilesAction = true,
}) => {
  const sheetRef = useRef<BottomSheetMethods>(null);

  const closeSheet = useCallback(() => sheetRef.current?.close(), []);

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Photo Library Access Required",
        "Please allow photo library access in settings.",
      );
      return false;
    }
    return true;
  };

  const openSheet = useCallback(() => {
    if (!disabled) sheetRef.current?.expand();
  }, [disabled]);

  const handleLibrary = useCallback(async () => {
    closeSheet();

    const granted = await requestLibraryPermission();
    if (!granted) return;

    const result = await withPickerGuard(() =>
      ExpoImagePicker.launchImageLibraryAsync(PICKER_OPTIONS),
    );

    if (result && !result.canceled && result.assets?.[0]) {
      onChange?.(result.assets[0].uri);
    }
  }, [closeSheet, onChange]);

  const handleFiles = useCallback(async () => {
    closeSheet();

    const result = await withPickerGuard(() =>
      DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      }),
    );

    if (result && !result.canceled && result.assets?.[0]?.uri) {
      onChange?.(result.assets[0].uri);
    }
  }, [closeSheet, onChange]);

  const handleRemove = useCallback(() => {
    closeSheet();
    onChange?.(null);
  }, [closeSheet, onChange]);

  const containerStyle: ViewStyle = {
    height,
    width,
  };

  const renderCircular = () => (
    <Pressable onPress={openSheet} disabled={disabled}>
      <Box
        width={size}
        height={size}
        borderRadius="full"
        backgroundColor={value ? "gray200" : "blue25"}
        justifyContent="center"
        alignItems="center"
        style={{ overflow: "hidden" }}
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Icon icon={ImagePlus} size="md" color="blue500" />
        )}
      </Box>
    </Pressable>
  );

  const renderRectangular = () => (
    <Pressable onPress={openSheet} disabled={disabled}>
      <Box
        borderRadius="xl"
        backgroundColor={value ? "gray200" : "blue25"}
        overflow="hidden"
        style={containerStyle}
        justifyContent="center"
        alignItems="center"
      >
        {value ? (
          <>
            <Image
              source={{ uri: value }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />

            <Box
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: "rgba(0,0,0,0.45)" },
              ]}
              flexDirection="row"
              gap="xs"
              alignItems="center"
              justifyContent="center"
            >
              <Icon icon={LucideImage} size="sm" color="white" />
              <Text variant="bodySmMedium" color="white">
                Change cover image
              </Text>
            </Box>
          </>
        ) : (
          <Box gap="xs" alignItems="center">
            <Icon icon={ImagePlus} size="md" color="blue500" />
            {showPlaceholderText ? (
              <Text variant="bodySmMedium" color="blue500">
                {placeholder}
              </Text>
            ) : null}
          </Box>
        )}
      </Box>
    </Pressable>
  );

  return (
    <>
      {variant === "circular" ? renderCircular() : renderRectangular()}

      <BottomSheetModal ref={sheetRef} snapPoints={["38%"]} initialIndex={-1}>
        <Box flex={1} padding="sm" gap="md">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box gap="xxs">
              <Text variant="headingLg">{title}</Text>
              {subtitle ? (
                <Text variant="bodySmDefault" color="gray500">
                  {subtitle}
                </Text>
              ) : null}
            </Box>

            <TouchableOpacity onPress={closeSheet} hitSlop={12}>
              <X size={24} />
            </TouchableOpacity>
          </Box>

          <Box gap="xxs">
            <ActionRow
              icon={Images}
              label="Choose from library"
              onPress={handleLibrary}
            />
            {showUploadFromFilesAction ? (
              <ActionRow
                icon={Upload}
                label="Upload from files"
                onPress={handleFiles}
              />
            ) : null}
            {value && showRemoveAction ? (
              <ActionRow
                icon={Trash2}
                label="Remove photo"
                onPress={handleRemove}
                color="statusError"
              />
            ) : null}
          </Box>
        </Box>
      </BottomSheetModal>
    </>
  );
};

export default ImagePicker;
