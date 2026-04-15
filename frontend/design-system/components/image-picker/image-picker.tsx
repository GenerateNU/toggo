import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Icon } from "@/design-system/components/icons/icon";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import type { ColorName } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ExpoImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {
  ImagePlus,
  Images,
  Image as LucideIconImage,
  Trash2,
  Upload,
  X,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
  title?: string;
  subtitle?: string;
  emptyStateBackgroundColor?: ColorName;
  emptyStateIconColor?: ColorName;
  showPlaceholderText?: boolean;
  showCameraAction?: boolean;
  showRemoveAction?: boolean;
  showUploadFromFilesAction?: boolean;
  recentsCount?: number;
}

const RECENT_THUMBNAIL_SIZE = 72;

const PICKER_OPTIONS: ExpoImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

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
  emptyStateBackgroundColor = "gray100",
  emptyStateIconColor = "gray500",
  showPlaceholderText = true,
  showRemoveAction = true,
  showUploadFromFilesAction = true,
  recentsCount = 10,
}) => {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [recentPhotos, setRecentPhotos] = useState<MediaLibrary.Asset[]>([]);

  const closeSheet = useCallback(() => sheetRef.current?.close(), []);

  const loadRecentPhotos = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return;
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: recentsCount,
      mediaType: [MediaLibrary.MediaType.photo],
      sortBy: [MediaLibrary.SortBy.creationTime],
    });
    setRecentPhotos(assets);
  }, [recentsCount]);

  const openSheet = useCallback(() => {
    if (!disabled) {
      loadRecentPhotos();
      sheetRef.current?.expand();
    }
  }, [disabled, loadRecentPhotos]);

  const handleLibrary = useCallback(async () => {
    closeSheet();
    const granted = await requestLibraryPermission();
    if (!granted) return;
    const result =
      await ExpoImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      onChange?.(result.assets[0].uri);
    }
  }, [closeSheet, onChange]);

  const handleFiles = useCallback(async () => {
    closeSheet();
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      onChange?.(result.assets[0].uri);
    }
  }, [closeSheet, onChange]);

  const handleSelectRecent = useCallback((uri: string) => {
    closeSheet();
    onChange?.(uri);
  }, [closeSheet, onChange]);

  const handleRemove = useCallback(() => {
    closeSheet();
    onChange?.(null);
  }, [closeSheet, onChange]);

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
        borderRadius="xl"
        backgroundColor={emptyStateBackgroundColor}
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
              <Icon icon={LucideIconImage} size="iconSm" color="white" />
              <Text variant="bodySmMedium" color="white">
                Change cover image
              </Text>
            </Box>
          </>
        ) : (
          <Box gap="xs" alignItems="center">
            <Icon icon={ImagePlus} size="md" color={emptyStateIconColor} />
            {showPlaceholderText ? (
              <Text variant="bodySmMedium" color={emptyStateIconColor}>
                {placeholder}
              </Text>
            ) : null}
          </Box>
        )}
      </Box>
    </Pressable>
  );

  const renderRecentThumbnails = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 14, paddingRight: 12 }}>
      <Box flexDirection="row" gap="xs">
        <Pressable onPress={handleLibrary}>
          <Box
            width={RECENT_THUMBNAIL_SIZE}
            height={RECENT_THUMBNAIL_SIZE}
            borderRadius="md"
            backgroundColor="gray100"
            justifyContent="center"
            alignItems="center"
          >
            <Icon icon={ImagePlus} size="sm" color="gray600" />
          </Box>
        </Pressable>
        {recentPhotos.map((asset) => (
          <Pressable
            key={asset.id}
            onPress={() => handleSelectRecent(asset.uri)}
          >
            <Box
              width={RECENT_THUMBNAIL_SIZE}
              height={RECENT_THUMBNAIL_SIZE}
              borderRadius="md"
              overflow="hidden"
            >
              <Image
                source={{ uri: asset.uri }}
                style={{
                  width: RECENT_THUMBNAIL_SIZE,
                  height: RECENT_THUMBNAIL_SIZE,
                }}
                contentFit="cover"
              />
            </Box>
          </Pressable>
        ))}
      </Box>
    </ScrollView>
  );

  return (
    <>
      {variant === "circular" ? renderCircular() : renderRectangular()}

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["36%"]}
        initialIndex={-1}
        disableScrollView
      >
        <Box flex={1} paddingVertical="sm" gap="md">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="flex-start"
            paddingHorizontal="sm"
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

          <Box gap="xs">
            <Text variant="bodySmMedium" color="black" paddingLeft="sm">
              Recents
            </Text>
            {renderRecentThumbnails()}
          </Box>

          <Box gap="xxs" paddingHorizontal="sm">
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
