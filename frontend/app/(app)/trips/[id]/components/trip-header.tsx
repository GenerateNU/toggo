import { Logo } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_HEADER_IMAGE_HEIGHT = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

type TripHeaderProps = {
  coverImageUrl?: string;
  absolute?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripHeader({ coverImageUrl, absolute = true }: TripHeaderProps) {
  return coverImageUrl ? (
    <Image
      source={{ uri: coverImageUrl }}
      style={[styles.coverImage, absolute ? styles.absoluteCoverImage : undefined]}
      contentFit="cover"
    />
  ) : (
    <View
      style={[
        styles.coverImage,
        styles.coverImageFallback,
        absolute ? styles.absoluteCoverImage : undefined,
      ]}
    >
      <Logo color="white" size="xxxl" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  coverImage: {
    height: TRIP_HEADER_IMAGE_HEIGHT,
  },
  absoluteCoverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  coverImageFallback: {
    backgroundColor: ColorPalette.brand400,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default TripHeader;
