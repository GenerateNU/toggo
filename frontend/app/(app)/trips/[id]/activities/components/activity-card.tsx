import { Box, Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { UserPlus } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress?: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const hasThumbnail = !!activity.thumbnail_url;
  const goingUsers = activity.going_users ?? [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}
    >
      <Box style={styles.card}>
        {/* Thumbnail */}
        {hasThumbnail && (
          <Image
            source={{ uri: activity.thumbnail_url! }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        {/* Content: [avatar] [name + price column] [RSVP button] */}
        <Box
          flexDirection="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap="xs"
        >
          {/* Left: avatar + name/price column */}
          <Box
            flexDirection="row"
            alignItems="flex-start"
            gap="xs"
            style={styles.infoLeft}
          >
            {activity.proposed_by && (
              <Avatar
                variant="md"
                seed={activity.proposed_by}
                profilePhoto={activity.proposer_picture_url ?? undefined}
              />
            )}
            <Box style={styles.namePrice}>
              <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
                {activity.name}
              </Text>
              {activity.estimated_price != null && (
                <Box flexDirection="row">
                  <Text variant="bodyXsStrong" color="gray950">
                    ${activity.estimated_price}
                  </Text>
                  <Text variant="bodyXsDefault" color="gray950">
                    {" per person"}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: RSVP button — static for now */}
          <Box style={styles.rsvpButton}>
            <UserPlus size={12} color={ColorPalette.white} />
            <Text variant="bodySmStrong" style={styles.rsvpText}>
              I'm going
            </Text>
          </Box>
        </Box>

        {/* Comment row */}
        {goingUsers.length > 0 && (
          <Box style={styles.commentRow}>
            <Box flexDirection="row" gap="xxs">
              {goingUsers.slice(0, 3).map((u) => (
                <Avatar
                  key={u.user_id}
                  variant="xs"
                  seed={u.user_id}
                  profilePhoto={u.profile_picture_url ?? undefined}
                />
              ))}
            </Box>
            <Text variant="bodySmStrong" style={styles.commentText}>
              1 new comment
            </Text>
          </Box>
        )}
      </Box>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: ColorPalette.white,
    borderRadius: 20,
    padding: 12,
    gap: 12,
  },
  thumbnail: {
    width: 346,
    height: 230,
    borderRadius: CornerRadius.md,
  },
  infoLeft: {
    flex: 1,
    minWidth: 0,
  },
  namePrice: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rsvpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ColorPalette.brand500,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Layout.spacing.xs,
    flexShrink: 0,
  },
  rsvpText: {
    color: ColorPalette.white,
    lineHeight: 16,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ColorPalette.blue25,
    borderRadius: CornerRadius.md,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 6,
  },
  commentText: {
    color: ColorPalette.blue500,
  },
});
