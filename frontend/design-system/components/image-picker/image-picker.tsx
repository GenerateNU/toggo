import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Icon } from "@/design-system/components/icons/icon";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Image } from "expo-image";
import * as ExpoImagePicker from "expo-image-picker";
import { Camera, ImageIcon, Trash2, X } from "lucide-react-native";
import React, { useRef } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

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
        backgroundColor="gray200"
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
          <Icon icon={ImageIcon} size="md" color="gray500" />
        )}
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
        backgroundColor="gray100"
        overflow="hidden"
        style={{ height }}
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
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: "rgba(0,0,0,0.45)" },
              ]}
            />
            <Box flexDirection="row" gap="xs" alignItems="center">
              <Icon icon={ImageIcon} size="md" color="white" />
              <Text variant="bodySmMedium" color="white">
                Change cover image
              </Text>
            </Box>
          </>
        ) : (
          <Box gap="xs" alignItems="center">
            <Icon icon={ImageIcon} size="md" color="gray500" />
            <Text variant="bodySmMedium" color="gray500">
              {placeholder}
            </Text>
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
            <Text variant="headingMd" color="gray900">
              Select photo
            </Text>
            <TouchableOpacity onPress={closeSheet} hitSlop={12}>
              <Icon icon={X} size="sm" color="gray500" />
            </TouchableOpacity>
          </Box>

          <TouchableOpacity onPress={handleCamera} activeOpacity={0.7}>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="md"
              padding="md"
              backgroundColor="gray50"
              borderRadius="md"
            >
              <Icon icon={Camera} size="sm" color="gray900" />
              <Text variant="bodyDefault" color="gray900">
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
              backgroundColor="gray50"
              borderRadius="md"
            >
              <Icon icon={ImageIcon} size="sm" color="gray500" />
              <Text variant="bodyDefault" color="gray900">
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
                backgroundColor="gray50"
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
