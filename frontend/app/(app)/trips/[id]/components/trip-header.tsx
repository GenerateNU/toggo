import { Box, ImagePicker } from "@/design-system";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

const TRIP_HEADER_IMAGE_HEIGHT = 300;

type TripHeaderProps = {
  coverImageUrl?: string;
  onChangeCoverImage?: (uri: string | null) => void;
  isCoverUploading?: boolean;
  disabled?: boolean;
  absolute?: boolean;
};

export function TripHeader({
  coverImageUrl,
  onChangeCoverImage,
  isCoverUploading,
  disabled,
  absolute = false,
}: TripHeaderProps) {
  const containerStyle = [
    styles.coverImage,
    absolute ? styles.absoluteCoverImage : undefined,
  ];

  return (
    <Box style={containerStyle}>
      {coverImageUrl ? (
        <Image
          source={{ uri: coverImageUrl }}
          style={styles.coverImageFill}
          contentFit="cover"
        />
      ) : (
        <ImagePicker
          variant="rectangular"
          width="100%"
          height={TRIP_HEADER_IMAGE_HEIGHT}
          value={coverImageUrl}
          onChange={onChangeCoverImage}
          placeholder=""
          showPlaceholderText={false}
          disabled={disabled || isCoverUploading}
          title="Add cover photo"
          showRemoveAction={false}
        />
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  coverImage: {
    height: TRIP_HEADER_IMAGE_HEIGHT,
    width: "100%",
  },
  absoluteCoverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  coverImageFill: {
    width: "100%",
    height: "100%",
  },
});

export default TripHeader;
