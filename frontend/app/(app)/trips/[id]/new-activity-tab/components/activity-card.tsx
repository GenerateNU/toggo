import { Box, Text } from "@/design-system";
import { UserAvatar } from "@/design-system/components/avatars/user-avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { BellDot } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { CTA_ICON_SIZE } from "../constants";
import type { ActivityCardProps } from "../types";
import ActivityCardHeader from "./activity-card-header";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityCard({
  name,
  actorId,
  timestamp,
  isUnread,
  onMarkRead,
  onView,
}: ActivityCardProps) {
  return (
    <Pressable onPress={onView} disabled={!onView}>
      <Box
        backgroundColor="white"
        borderRadius="md"
        overflow="hidden"
        style={[styles.cardShadow, !isUnread && styles.cardRead]}
      >
        <Box style={styles.cardInner}>
          <ActivityCardHeader
            activityType="activity"
            timestamp={timestamp}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
            goToLabel="Go to activity"
            onGoTo={onView}
          />

          <Box flexDirection="row" alignItems="center" gap="xs">
            {actorId && <UserAvatar variant="sm" userId={actorId} />}
            <Text
              variant="bodyMedium"
              color="gray950"
              numberOfLines={2}
              style={{ flex: 1 }}
            >
              {name.trim()}
            </Text>
          </Box>

          <Pressable onPress={onView} style={styles.ctaButton}>
            <BellDot size={CTA_ICON_SIZE} color={ColorPalette.blue500} />
            <Text variant="bodyStrong" style={styles.ctaLabel}>
              View activity
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
    padding: Layout.spacing.sm - Layout.spacing.xxs,
    gap: Layout.spacing.sm - Layout.spacing.xxs,
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
