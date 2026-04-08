import { BackButton } from "@/design-system/components/navigation/arrow";
import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Image } from "expo-image";
import { Map } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripHeaderProps = {
  coverImageUrl?: string;
  onMapPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripHeader({ coverImageUrl, onMapPress }: TripHeaderProps) {
  return (
    <>
      {coverImageUrl ? (
        <Image
          source={{ uri: coverImageUrl }}
          style={styles.coverImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.coverImage, styles.coverImageFallback]} />
      )}

      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="sm"
        paddingVertical="xs"
      >
        <BackButton />

        <Pressable
          onPress={onMapPress}
          style={styles.mapButton}
          accessibilityRole="button"
          accessibilityLabel="View map"
        >
          <Map size={16} color={ColorPalette.gray950} />
          <Text variant="bodySmMedium" color="gray950">
            Map
          </Text>
        </Pressable>
      </Box>
    </>
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
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xxs,
    borderRadius: CornerRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default TripHeader;
