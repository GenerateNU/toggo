import { Box, ImagePicker } from "@/design-system";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_HEADER_IMAGE_HEIGHT = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

type TripHeaderProps = {
  coverImageUrl?: string;
  onChangeCoverImage?: (uri: string | null) => void;
  isCoverUploading?: boolean;
  disabled?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripHeader({
  coverImageUrl,
  onChangeCoverImage,
  isCoverUploading,
  disabled,
}: TripHeaderProps) {
  if (coverImageUrl) {
    return (
      <Box style={styles.coverImage}>
        <Image
          source={{ uri: coverImageUrl }}
          style={styles.coverImageFill}
          contentFit="cover"
        />
      </Box>
    );
  }

  return (
    <Box style={styles.coverImage}>
      <ImagePicker
        variant="rectangular"
        width="100%"
        height={TRIP_HEADER_IMAGE_HEIGHT}
        value={coverImageUrl}
        onChange={onChangeCoverImage}
        placeholder=""
        showPlaceholderText={false}
        disabled={disabled || isCoverUploading}
        title="Change cover photo"
        showRemoveAction={false}
      />
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  coverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TRIP_HEADER_IMAGE_HEIGHT,
  },
  coverImageFill: {
    width: "100%",
    height: "100%",
  },
});

export default TripHeader;
