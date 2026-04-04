import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Icon } from "@/design-system/components/icons/icon";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Image } from "expo-image";
import * as ExpoImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Images, Trash2, X } from "lucide-react-native";
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
  title?: string;
  subtitle?: string;
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
  title = "Select photo",
  subtitle,
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
          <Icon icon={ImagePlus} size="md" color="gray500" />
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
              <Icon icon={Images} size="md" color="white" />
              <Text variant="bodySmMedium" color="white">
                Change cover image
              </Text>
            </Box>
          </>
        ) : (
          <Box gap="xs" alignItems="center">
            <Icon icon={ImagePlus} size="md" color="gray500" />
            <Text variant="bodySmMedium" color="gray500">
              {placeholder}
            </Text>
          </Box>
        )}
      </Box>
    </Pressable>
  );

  const snapPoints = value ? ["48%"] : ["40%"];

  return (
    <>
      {variant === "circular" ? renderCircular() : renderRectangular()}

      <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} initialIndex={-1}>
        <Box flex={1} paddingHorizontal="lg" paddingTop="md" gap="lg">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box flex={1} gap="xxs">
              <Text variant="headingMd" color="gray900">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="bodySmDefault" color="gray500">
                  {subtitle}
                </Text>
              ) : null}
            </Box>
            <TouchableOpacity onPress={closeSheet} hitSlop={12}>
              <Icon icon={X} size="sm" color="gray500" />
            </TouchableOpacity>
          </Box>

          <Box gap="sm">
            <TouchableOpacity onPress={handleLibrary} activeOpacity={0.7}>
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="sm"
                paddingVertical="lg"
                backgroundColor="gray100"
                borderRadius="lg"
              >
                <Icon icon={Images} size="md" color="gray900" />
                <Text variant="bodyMedium" color="gray900">
                  Choose from library
                </Text>
              </Box>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCamera} activeOpacity={0.7}>
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="sm"
                paddingVertical="lg"
                backgroundColor="gray100"
                borderRadius="lg"
              >
                <Icon icon={Camera} size="md" color="gray900" />
                <Text variant="bodyMedium" color="gray900">
                  Take photo
                </Text>
              </Box>
            </TouchableOpacity>

            {value && (
              <TouchableOpacity onPress={handleRemove} activeOpacity={0.7}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  gap="sm"
                  paddingVertical="lg"
                  backgroundColor="gray100"
                  borderRadius="lg"
                >
                  <Icon icon={Trash2} size="md" color="statusError" />
                  <Text variant="bodyMedium" color="statusError">
                    Remove photo
                  </Text>
                </Box>
              </TouchableOpacity>
            )}
          </Box>
        </Box>
      </BottomSheetModal>
    </>
  );
};

export default ImagePicker;
