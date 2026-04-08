import { ColorPalette } from "@/design-system/tokens/color";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

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
    height: 260,
  },
  coverImageFallback: {
    backgroundColor: ColorPalette.gray100,
  },
});

export default TripHeader;
