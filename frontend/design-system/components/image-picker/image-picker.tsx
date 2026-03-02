import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Image } from "expo-image";
import * as ExpoImagePicker from "expo-image-picker";
import { Camera, ImageIcon, Pencil, Trash2, X } from "lucide-react-native";
import React, { useRef } from "react";
import { Alert, Pressable, StyleSheet, TouchableOpacity } from "react-native";

export type ImagePickerVariant = "circular" | "rectangular";

export interface ImagePickerProps {
  value?: string;
  onChange?: (uri: string | null) => void;
  variant?: ImagePickerVariant;
  size?: number;
  width?: number | string;
  height?: number;
  placeholder?: string;
  disabled?: boolean;
}

const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera Access Required",
      "Please allow camera access in your settings to take a photo.",
    );
    return false;
  }
  return true;
};

const requestLibraryPermission = async (): Promise<boolean> => {
  const { status } =
    await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo Library Access Required",
      "Please allow photo library access in your settings to choose a photo.",
    );
    return false;
  }
  return true;
};

const PICKER_OPTIONS: ExpoImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export const ImagePicker: React.FC<ImagePickerProps> = ({
  value,
  onChange,
  variant = "circular",
  size = 88,
  width = "100%",
  height = 200,
  placeholder = "Add photo",
  disabled = false,
}) => {
  const sheetRef = useRef<BottomSheetMethods>(null);

  const openSheet = () => {
    if (!disabled) sheetRef.current?.expand();
  };

  const closeSheet = () => sheetRef.current?.close();

  const handleCamera = async () => {
    closeSheet();
    const granted = await requestCameraPermission();
    if (!granted) return;

    const result = await ExpoImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      onChange?.(result.assets[0].uri);
    }
  };

  const handleLibrary = async () => {
    closeSheet();
    const granted = await requestLibraryPermission();
    if (!granted) return;

    const result =
      await ExpoImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      onChange?.(result.assets[0].uri);
    }
  };

  const handleRemove = () => {
    closeSheet();
    onChange?.(null);
  };

  const renderCircular = () => (
    <Pressable onPress={openSheet} disabled={disabled}>
      <Box
        width={size}
        height={size}
        borderRadius="full"
        backgroundColor="secondaryBackground"
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
          <ImageIcon size={size * 0.35} color="#858585" />
        )}
      </Box>

      <Box
        position="absolute"
        bottom={0}
        right={0}
        width={size * 0.32}
        height={size * 0.32}
        borderRadius="full"
        backgroundColor="black"
        justifyContent="center"
        alignItems="center"
        borderWidth={2}
        borderColor="white"
      >
        <Pencil size={size * 0.14} color="#FFFFFF" />
      </Box>
    </Pressable>
  );

  const renderRectangular = () => (
    <Pressable
      onPress={openSheet}
      disabled={disabled}
      style={{ width: width as any }}
    >
      <Box
        borderRadius="md"
        backgroundColor="secondaryBackground"
        borderWidth={1}
        borderColor="borderPrimary"
        overflow="hidden"
        style={{ height }}
        justifyContent="center"
        alignItems="center"
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Box gap="xs" alignItems="center">
            <ImageIcon size={32} color="#858585" />
            <Text variant="smLabel" color="textQuaternary">
              {placeholder}
            </Text>
          </Box>
        )}

        {value && (
          <Box
            position="absolute"
            bottom={0}
            right={0}
            backgroundColor="black"
            padding="xs"
            borderTopLeftRadius="sm"
          >
            <Pencil size={14} color="#FFFFFF" />
          </Box>
        )}
      </Box>
    </Pressable>
  );

  return (
    <>
      {variant === "circular" ? renderCircular() : renderRectangular()}

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={value ? ["45%"] : ["38%"]}
        initialIndex={-1}
      >
        <Box flex={1} padding="lg" gap="sm">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="xs"
          >
            <Text variant="lgHeading" color="textSecondary">
              Select photo
            </Text>
            <TouchableOpacity onPress={closeSheet} hitSlop={12}>
              <X size={20} color="#858585" />
            </TouchableOpacity>
          </Box>

          <TouchableOpacity onPress={handleCamera} activeOpacity={0.7}>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="md"
              padding="md"
              backgroundColor="surfaceBackground"
              borderRadius="md"
            >
              <Camera size={20} color="#000000" />
              <Text variant="mdParagraph" color="textSecondary">
                Take a photo
              </Text>
            </Box>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLibrary} activeOpacity={0.7}>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="md"
              padding="md"
              backgroundColor="surfaceBackground"
              borderRadius="md"
            >
              <ImageIcon size={20} color="#000000" />
              <Text variant="mdParagraph" color="textSecondary">
                Choose from library
              </Text>
            </Box>
          </TouchableOpacity>

          {value && (
            <TouchableOpacity onPress={handleRemove} activeOpacity={0.7}>
              <Box
                flexDirection="row"
                alignItems="center"
                gap="md"
                padding="md"
                backgroundColor="surfaceBackground"
                borderRadius="md"
              >
                <Trash2 size={20} color="#FF3B30" />
                <Text variant="mdParagraph" color="error">
                  Remove photo
                </Text>
              </Box>
            </TouchableOpacity>
          )}
        </Box>
      </BottomSheetModal>
    </>
  );
};

export default ImagePicker;
