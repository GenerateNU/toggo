import { Box, Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { Heart } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

type ActivityCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress?: () => void;
  isNew?: boolean;
};

export function ActivityCard({ activity, onPress, isNew }: ActivityCardProps) {
  const hasThumbnail = !!activity.thumbnail_url;
  const goingCount = activity.going_count ?? 0;
  const goingUsers = activity.going_users ?? [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}
    >
      <Box style={styles.card}>
        {/* Thumbnail */}
        {hasThumbnail && (
          <Box style={styles.thumbnailContainer}>
            <Image
              source={{ uri: activity.thumbnail_url! }}
              style={styles.thumbnail}
              contentFit="cover"
            />
            {isNew && (
              <Box style={styles.newBadge}>
                <Text variant="bodyXxsMedium" color="white">
                  New • 1m
                </Text>
              </Box>
            )}
          </Box>
        )}

        {/* Content */}
        <Box style={styles.content}>
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text
              variant="bodySmMedium"
              color="gray900"
              style={{ flex: 1 }}
              numberOfLines={1}
            >
              {activity.name}
            </Text>
            <Box flexDirection="row" alignItems="center" gap="xs">
              {goingCount > 0 && (
                <Box flexDirection="row" alignItems="center" gap="xxs">
                  <Heart
                    size={14}
                    color={ColorPalette.statusError}
                    fill={ColorPalette.statusError}
                  />
                  <Text variant="bodyXsMedium" color="gray500">
                    {goingCount}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>

          {activity.estimated_price != null && (
            <Text variant="bodyXsDefault" color="gray500">
              ${activity.estimated_price} per person
            </Text>
          )}

          {goingUsers.length > 0 && (
            <Box flexDirection="row" alignItems="center" gap="xxs">
              {goingUsers.slice(0, 3).map((u) => (
                <Avatar
                  key={u.user_id}
                  variant="xs"
                  seed={u.user_id}
                  profilePhoto={u.profile_picture_url ?? undefined}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Comments row — placeholder, comments ticket is separate */}
        {isNew && (
          <Box style={styles.commentRow}>
            <Text variant="bodyXsMedium" color="blue500">
              1 new comment
            </Text>
          </Box>
        )}
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.lg,
    overflow: "hidden",
    ...Elevation.xs,
  },
  thumbnailContainer: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  newBadge: {
    position: "absolute",
    top: Layout.spacing.xs,
    left: Layout.spacing.xs,
    backgroundColor: ColorPalette.brand500,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: CornerRadius.sm,
  },
  content: {
    padding: Layout.spacing.xs,
    gap: 4,
  },
  commentRow: {
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xs,
    backgroundColor: ColorPalette.blue50,
  },
});