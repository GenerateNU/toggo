import { Box, Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import AvatarStack from "@/design-system/components/avatars/avatar-stack";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { Image } from "expo-image";
import { Pressable, StyleSheet } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type CommentPreview = {
  user_id?: string;
  profile_picture_url?: string;
  name?: string;
  created_at?: string;
};

export type EntityCardProps = {
  thumbnailUrl?: string;
  proposedBy?: string;
  proposerPictureUrl?: string;
  name: string;
  priceLabel?: string;
  actionButton: React.ReactNode;
  commentCount: number;
  commentPreviews: CommentPreview[];
  onPress: () => void;
  onOpenComments: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCommentTimeLabel(rawDate?: string): string {
  if (!rawDate) return "";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (24 * 60 * 60 * 1000),
  );

  const timePart = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" AM", "am")
    .replace(" PM", "pm");

  if (dayDiff === 0) return `Today at ${timePart}`;
  if (dayDiff === 1) return `Yesterday at ${timePart}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${timePart}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EntityCard({
  thumbnailUrl,
  proposedBy,
  proposerPictureUrl,
  name,
  priceLabel,
  actionButton,
  commentCount,
  commentPreviews,
  onPress,
  onOpenComments,
}: EntityCardProps) {
  const firstCommentTime = formatCommentTimeLabel(
    (commentPreviews[0] as { created_at?: string } | undefined)?.created_at,
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}
    >
      <Box style={styles.card}>
        {thumbnailUrl && (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        <Box
          flexDirection="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap="xs"
        >
          <Box
            flexDirection="row"
            alignItems="flex-start"
            gap="xs"
            style={styles.infoLeft}
          >
            {proposedBy && (
              <Avatar
                variant="md"
                seed={proposedBy}
                profilePhoto={proposerPictureUrl ?? undefined}
              />
            )}
            <Box style={styles.namePrice}>
              <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
                {name}
              </Text>
              {priceLabel && (
                <Text style={styles.priceLabel} numberOfLines={1}>
                  {priceLabel}
                </Text>
              )}
            </Box>
          </Box>

          {actionButton}
        </Box>

        <Pressable onPress={onOpenComments}>
          <Box
            flexDirection="row"
            alignItems="center"
            backgroundColor="gray50"
            borderRadius="md"
            paddingHorizontal="xs"
            paddingVertical="xs"
            gap="xs"
          >
            {commentPreviews.length > 0 && (
              <AvatarStack
                members={commentPreviews.map((p) => ({
                  userId: p.user_id ?? "",
                  profilePhotoUrl: p.profile_picture_url,
                  name: p.name,
                }))}
                maxVisible={3}
                showName={false}
              />
            )}
            <Text
              variant="bodySmMedium"
              color="gray900"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {commentCount === 0
                ? "No comments yet"
                : `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
            </Text>
            {commentCount > 0 && firstCommentTime ? (
              <Text
                variant="bodySmDefault"
                color="gray500"
                numberOfLines={1}
                style={{ maxWidth: "55%" }}
              >
                {firstCommentTime}
              </Text>
            ) : null}
          </Box>
        </Pressable>
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
    width: "100%",
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
  priceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: ColorPalette.gray950,
  },
});
