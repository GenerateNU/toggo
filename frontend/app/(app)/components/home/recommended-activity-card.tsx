import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Shadow } from "@/design-system/tokens/elevation";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { Pressable, StyleSheet } from "react-native";

type ActivityCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress?: () => void;
};

function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return `$${price} per person`;
}

export function RecommendedActivityCard({
  activity,
  onPress,
}: ActivityCardProps) {
  const hasThumbnail = !!activity.thumbnail_url;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}
    >
      <Box style={styles.card}>
        {hasThumbnail && (
          <Image
            source={{ uri: activity.thumbnail_url! }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        <Box gap="xxs">
          <Text variant="bodyStrong" numberOfLines={1}>
            {activity.name}
          </Text>
          {activity.estimated_price != null && (
            <Text variant="bodyXsDefault" color="gray950">
              {formatPrice(activity.estimated_price)}
            </Text>
          )}
        </Box>
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.xl,
    padding: 12,
    gap: 12,
    ...Shadow.md,
  },
  thumbnail: {
    width: 291,
    height: 194.09,
    borderRadius: CornerRadius.md,
  },
});
