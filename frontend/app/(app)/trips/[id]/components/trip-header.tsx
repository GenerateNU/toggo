import { ColorPalette } from "@/design-system/tokens/color";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_HEADER_IMAGE_HEIGHT = 260;

// ─── Types ────────────────────────────────────────────────────────────────────

type TripHeaderProps = {
  coverImageUrl?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripHeader({ coverImageUrl }: TripHeaderProps) {
  return coverImageUrl ? (
    <Image
      source={{ uri: coverImageUrl }}
      style={styles.coverImage}
      contentFit="cover"
    />
  ) : (
    <View style={[styles.coverImage, styles.coverImageFallback]} />
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
  coverImageFallback: {
    backgroundColor: ColorPalette.gray100,
  },
});

export default TripHeader;
