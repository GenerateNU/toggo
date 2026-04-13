import { Box, Text } from "@/design-system";
import { UserAvatar } from "@/design-system/components/avatars/user-avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { BellDot, MessageCircle } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import {
  CONTEXT_ICON_SIZE,
  CTA_ICON_SIZE,
  AVATAR_TEXT_GAP,
  TEXT_COLUMN_GAP,
} from "../constants";
import type { ActivityCommentCardProps } from "../types";
import ActivityCardHeader from "./activity-card-header";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityCommentCard({
  comment,
  timestamp,
  isUnread,
  onMarkRead,
  onViewComment,
}: ActivityCommentCardProps) {
  const contextLabel = comment.entity_name
    ? `on ${comment.entity_name} ${comment.entity_type ?? "pitch"}`
    : null;

  return (
    <Box
      backgroundColor="white"
      borderRadius="xl"
      overflow="hidden"
      style={[styles.cardShadow, !isUnread && styles.cardRead]}
    >
      <Box style={styles.cardInner}>
        <ActivityCardHeader
          activityType="comment"
          timestamp={timestamp}
          isUnread={isUnread}
          onMarkRead={onMarkRead}
          goToLabel="Go to conversation"
          onGoTo={onViewComment}
        />

        <Box
          flexDirection="row"
          alignItems="flex-start"
          style={{ gap: AVATAR_TEXT_GAP }}
        >
          {comment.user_id && (
            <UserAvatar variant="sm" userId={comment.user_id} />
          )}
          <Box style={styles.commentBody}>
            <Text variant="bodySmStrong" color="black" numberOfLines={1}>
              {comment.user_name ?? "Someone"}
            </Text>
            <Text
              variant="bodySmDefault"
              color="black"
              numberOfLines={3}
              style={styles.commentText}
            >
              {comment.body}
            </Text>
            {contextLabel && (
              <Box
                flexDirection="row"
                alignItems="center"
                style={{ gap: AVATAR_TEXT_GAP, paddingTop: AVATAR_TEXT_GAP }}
              >
                <MessageCircle
                  size={CONTEXT_ICON_SIZE}
                  color={ColorPalette.gray500}
                />
                <Text
                  variant="bodyXsDefault"
                  color="gray500"
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {contextLabel}
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        <Pressable onPress={onViewComment} style={styles.ctaButton}>
          <BellDot size={CTA_ICON_SIZE} color={ColorPalette.blue500} />
          <Text variant="bodyStrong" style={styles.ctaLabel}>
            View conversation
          </Text>
        </Pressable>
      </Box>
    </Box>
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
  commentBody: {
    flex: 1,
    gap: TEXT_COLUMN_GAP,
  },
  commentText: {
    lineHeight: 17,
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
