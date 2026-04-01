import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Icon } from "@/design-system/components/icons/icon";
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
        backgroundColor="backgroundMuted"
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
          <Icon icon={ImageIcon} size="md" color="textSubtle" />
        )}
      </Box>

      <Box
        position="absolute"
        bottom={0}
        right={0}
        width={size * 0.32}
        height={size * 0.32}
        borderRadius="full"
        backgroundColor="backgroundDefault"
        justifyContent="center"
        alignItems="center"
        borderWidth={2}
        borderColor="backgroundCard"
      >
        <Icon icon={Pencil} size="xs" color="textDefault" />
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
        backgroundColor="backgroundMuted"
        borderWidth={1}
        borderColor="borderDefault"
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
            <Icon icon={ImageIcon} size="md" color="textSubtle" />
            <Text variant="bodySmMedium" color="textSubtle">
              {placeholder}
            </Text>
          </Box>
        )}

        {value && (
          <Box
            position="absolute"
            bottom={0}
            right={0}
            backgroundColor="backgroundDefault"
            padding="xs"
            borderTopLeftRadius="sm"
          >
            <Icon icon={Pencil} size="xs" color="textDefault" />
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
            <Text variant="headingMd" color="textDefault">
              Select photo
            </Text>
            <TouchableOpacity onPress={closeSheet} hitSlop={12}>
              <Icon icon={X} size="sm" color="textSubtle" />
            </TouchableOpacity>
          </Box>

          <TouchableOpacity onPress={handleCamera} activeOpacity={0.7}>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="md"
              padding="md"
              backgroundColor="backgroundSubtle"
              borderRadius="md"
            >
              <Icon icon={Camera} size="sm" color="iconInverse" />
              <Text variant="bodyDefault" color="textDefault">
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
              backgroundColor="backgroundSubtle"
              borderRadius="md"
            >
              <Icon icon={ImageIcon} size="sm" color="textSubtle" />
              <Text variant="bodyDefault" color="textDefault">
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
                backgroundColor="backgroundSubtle"
                borderRadius="md"
              >
                <Icon icon={Trash2} size="sm" color="statusError" />
                <Text variant="bodyDefault" color="statusError">
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
