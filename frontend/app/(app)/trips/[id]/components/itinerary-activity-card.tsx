import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { MapPin } from "lucide-react-native";
import { Image, Pressable, StyleSheet } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const THUMBNAIL_SIZE = 56;

// ─── Types ────────────────────────────────────────────────────────────────────

type ItineraryActivityCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price?: number): string | null {
  if (price == null) return null;
  if (price === 0) return "Free";
  return `$${price} per person`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryActivityCard({
  activity,
  onPress,
}: ItineraryActivityCardProps) {
  const priceLabel = formatPrice(activity.estimated_price);
  const thumbnailUrl = activity.thumbnail_url ?? activity.media_url;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={activity.name ?? "Activity"}
    >
      <Box
        width={THUMBNAIL_SIZE}
        height={THUMBNAIL_SIZE}
        borderRadius="md"
        overflow="hidden"
        backgroundColor="gray100"
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : null}
      </Box>

      <Box flex={1} gap="xxs">
        <Text variant="bodySmMedium" color="gray950" numberOfLines={1}>
          {activity.name ?? "Unnamed Activity"}
        </Text>

        <Box flexDirection="row" alignItems="center" gap="xs" flexWrap="wrap">
          {priceLabel && (
            <Box
              backgroundColor="gray100"
              borderRadius="xs"
              paddingHorizontal="xs"
              paddingVertical="xxs"
            >
              <Text variant="bodyXxsMedium" color="gray700">
                {priceLabel}
              </Text>
            </Box>
          )}

          {activity.location_name && (
            <Box flexDirection="row" alignItems="center" gap="xxs">
              <MapPin size={12} color={ColorPalette.gray500} />
              <Text
                variant="bodyXxsDefault"
                color="gray500"
                numberOfLines={1}
              >
                {activity.location_name}
              </Text>
            </Box>
          )}
        </Box>

        {activity.description && (
          <Text variant="bodyXxsDefault" color="gray400" numberOfLines={1}>
            {activity.description}
          </Text>
        )}
      </Box>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    padding: Layout.spacing.sm,
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.xl,
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  pressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
});

export default ItineraryActivityCard;
