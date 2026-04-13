import { Box, Text } from "@/design-system";
import { UserAvatar } from "@/design-system/components/avatars/user-avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { BellDot } from "lucide-react-native";
import { Image, Pressable, StyleSheet } from "react-native";
import { CTA_ICON_SIZE, THUMBNAIL_HEIGHT } from "../constants";
import type { ActivityPitchCardProps } from "../types";
import ActivityCardHeader from "./activity-card-header";

export default function ActivityPitchCard({
  pitch,
  timestamp,
  isUnread,
  onMarkRead,
  onViewPitch,
}: ActivityPitchCardProps) {
  const thumbnailUrl =
    pitch.images?.[0]?.medium_url ?? pitch.links?.[0]?.thumbnail_url ?? null;

  return (
    <Pressable onPress={onViewPitch} disabled={!onViewPitch}>
      <Box
        backgroundColor="white"
        borderRadius="xl"
        overflow="hidden"
        style={[styles.cardShadow, !isUnread && styles.cardRead]}
      >
        <Box style={styles.cardInner}>
          <ActivityCardHeader
            activityType="pitch"
            timestamp={timestamp}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
            goToLabel="Go to pitch"
            onGoTo={onViewPitch}
          />

          <Box gap="sm">
            {thumbnailUrl && (
              <Box style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </Box>
            )}

            <Box flexDirection="row" alignItems="center" gap="xs">
              {pitch.user_id && (
                <UserAvatar variant="sm" userId={pitch.user_id} />
              )}
              <Text
                variant="headingSm"
                color="gray950"
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {pitch.title ?? "Untitled Pitch"}
              </Text>
            </Box>
          </Box>

          <Pressable onPress={onViewPitch} style={styles.ctaButton}>
            <BellDot size={CTA_ICON_SIZE} color={ColorPalette.blue500} />
            <Text variant="bodyStrong" style={styles.ctaLabel}>
              View pitch
            </Text>
          </Pressable>
        </Box>
      </Box>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: Layout.spacing.xs,
    elevation: 3,
  },
  cardRead: {
    borderWidth: 2,
    borderColor: ColorPalette.gray100,
  },
  cardInner: {
    paddingTop: Layout.spacing.sm - Layout.spacing.xxs,
    paddingBottom: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm - Layout.spacing.xxs,
    gap: Layout.spacing.sm - Layout.spacing.xxs,
  },
  thumbnailContainer: {
    height: THUMBNAIL_HEIGHT,
    borderRadius: CornerRadius.sm,
    overflow: "hidden",
    backgroundColor: ColorPalette.gray100,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Layout.spacing.xs,
    backgroundColor: ColorPalette.blue25,
    borderRadius: CornerRadius.md,
    padding: Layout.spacing.sm - Layout.spacing.xxs,
  },
  ctaLabel: {
    color: ColorPalette.blue500,
  },
});
