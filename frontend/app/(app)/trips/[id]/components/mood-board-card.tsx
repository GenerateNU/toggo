import {
  activityRsvpGoingPayload,
  useActivityRsvpGoing,
} from "@/api/activities/custom/useActivityRsvpGoing";
import { Box, Icon, Text, useToast } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import {
  getActivityProposerProfilePictureUrl,
  getActivityThumbnailUrl,
} from "@/utils/activity-helpers";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, Link2, MessageCircle } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Image as RNImage,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { getMoodBoardColumnWidth } from "./mood-board-masonry";
import { getMoodBoardVariant } from "./mood-board-utils";

/** Matches parent horizontal padding + column gap so each card is exactly one column wide. */
function useMoodBoardColumnWidth(): number {
  const { width: screenWidth } = useWindowDimensions();
  return useMemo(
    () => getMoodBoardColumnWidth(screenWidth),
    [screenWidth],
  );
}

type MoodBoardCardProps = {
  activity: ModelsActivityAPIResponse;
  tripID: string;
  onPress: () => void;
};

function moodBoardDisplayName(activity: ModelsActivityAPIResponse): string {
  const u = activity.proposer_username?.trim();
  if (u) return u.split(/\s+/)[0] ?? u;
  const n = activity.proposer_name?.trim();
  if (n) return n.split(/\s+/)[0] ?? n;
  return "Member";
}

/** Short relative label, e.g. `20m`, `4d` (matches mood board reference). */
function formatMoodBoardShortTime(iso: string | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return `${Math.floor(diffDay / 7)}w`;
}

export function MoodBoardCard({
  activity,
  tripID,
  onPress,
}: MoodBoardCardProps) {
  const variant = getMoodBoardVariant(activity);
  const title = activity.name?.trim() || "Untitled";
  const body = activity.description?.trim();
  const resolvedThumbnailUrl = getActivityThumbnailUrl(activity);
  const rsvpMutation = useActivityRsvpGoing(tripID);
  const toast = useToast();
  const columnWidth = useMoodBoardColumnWidth();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.press,
        { width: columnWidth, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <Box
        style={[
          variant === "text" ? styles.cardNoteWrap : styles.card,
          { width: columnWidth },
        ]}
        backgroundColor={variant === "text" ? "transparent" : "white"}
      >
        {variant === "text" && (
          <MoodBoardTextCard
            proposerProfilePhoto={getActivityProposerProfilePictureUrl(activity)}
            activity={activity}
            body={body}
            title={title}
            onPressRsvp={() => {
              if (!activity.id) return;
              rsvpMutation.mutate(
                {
                  tripID,
                  activityID: activity.id,
                  data: activityRsvpGoingPayload,
                },
                {
                  onError: () =>
                    toast.show({ message: "Could not update going status." }),
                },
              );
            }}
            rsvpPending={rsvpMutation.isPending}
          />
        )}

        {variant === "image" && (
          <MoodBoardImageOuter
            proposerProfilePhoto={getActivityProposerProfilePictureUrl(activity)}
            activity={activity}
            columnWidth={columnWidth}
            thumbnailUrl={resolvedThumbnailUrl}
            rsvpPending={rsvpMutation.isPending}
            onRsvpGoing={() => {
              if (!activity.id) return;
              rsvpMutation.mutate(
                {
                  tripID,
                  activityID: activity.id,
                  data: activityRsvpGoingPayload,
                },
                {
                  onError: () =>
                    toast.show({ message: "Could not update going status." }),
                },
              );
            }}
          />
        )}

        {variant === "link" && (
          <Box style={{ width: columnWidth }}>
            {resolvedThumbnailUrl ? (
              <MoodBoardLinkPreview
                thumbnailUrl={resolvedThumbnailUrl}
                columnWidth={columnWidth}
              />
            ) : (
              <Box
                style={styles.linkPlaceholder}
                alignItems="center"
                justifyContent="center"
              >
                <Link2 size={28} color={ColorPalette.gray400} />
              </Box>
            )}
            <Box padding="xs" gap="xxs">
              <Text variant="bodySmStrong" color="blue500" numberOfLines={2}>
                {title}
              </Text>
              {activity.media_url ? (
                <Text variant="bodyXsDefault" color="gray500" numberOfLines={1}>
                  {activity.media_url}
                </Text>
              ) : null}
            </Box>
          </Box>
        )}
      </Box>
    </Pressable>
  );
}

function MoodBoardTextCard({
  activity,
  proposerProfilePhoto,
  body,
  title,
  onPressRsvp,
  rsvpPending,
}: {
  activity: ModelsActivityAPIResponse;
  proposerProfilePhoto: string | undefined;
  body: string | undefined;
  title: string;
  onPressRsvp: () => void;
  rsvpPending: boolean;
}) {
  const timeLabel = formatMoodBoardShortTime(activity.created_at);
  const name = moodBoardDisplayName(activity);
  const comments = activity.comment_count ?? 0;
  const likes = activity.going_count ?? 0;

  return (
    <Box
      width="100%"
      backgroundColor="backgroundWarm"
      padding="sm"
      gap="xs"
      borderRadius="lg"
      style={styles.noteCardSurface}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box
          flexDirection="row"
          alignItems="center"
          gap="xs"
          flex={1}
          minWidth={0}
          marginRight="xs"
        >
          {activity.proposed_by ? (
            <Avatar
              variant="sm"
              seed={activity.proposed_by}
              profilePhoto={proposerProfilePhoto}
            />
          ) : null}
          <Text variant="bodySmStrong" color="gray950" numberOfLines={1}>
            {name}
          </Text>
        </Box>
        {timeLabel ? (
          <Text variant="bodyXsDefault" color="gray500">
            {timeLabel}
          </Text>
        ) : null}
      </Box>

      <Text variant="bodyStrong" color="gray950" numberOfLines={8}>
        {body || title}
      </Text>

      <Box
        flexDirection="row"
        alignItems="center"
        gap="md"
        marginTop="xxs"
      >
        <Pressable
          onPress={onPressRsvp}
          disabled={rsvpPending || !activity.id}
          hitSlop={6}
          accessibilityLabel="Mark as going"
        >
          <Box flexDirection="row" alignItems="center" gap="xxs">
            <Icon icon={Heart} size="xs" color="gray700" />
            <Text variant="bodySmDefault" color="gray800">
              {likes}
            </Text>
          </Box>
        </Pressable>
        <Box flexDirection="row" alignItems="center" gap="xxs">
          <Icon icon={MessageCircle} size="xs" color="gray700" />
          <Text variant="bodySmDefault" color="gray800">
            {comments}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

function MoodBoardImageOuter({
  activity,
  proposerProfilePhoto,
  columnWidth,
  thumbnailUrl,
  onRsvpGoing,
  rsvpPending,
}: {
  activity: ModelsActivityAPIResponse;
  proposerProfilePhoto: string | undefined;
  columnWidth: number;
  thumbnailUrl?: string;
  onRsvpGoing: () => void;
  rsvpPending: boolean;
}) {
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!thumbnailUrl?.trim()) {
      setAspect(null);
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      thumbnailUrl,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setAspect(w / h);
        }
      },
      () => {
        if (!cancelled) setAspect(1);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl]);

  const likes = activity.going_count ?? 0;
  const comments = activity.comment_count ?? 0;
  const timeLabel = formatMoodBoardShortTime(activity.created_at);
  const name = moodBoardDisplayName(activity);
  const imageAspect = aspect != null && aspect > 0 ? aspect : 1;
  const imageHeight = columnWidth / imageAspect;

  if (!thumbnailUrl) {
    return (
      <Box
        backgroundColor="gray100"
        alignItems="center"
        justifyContent="center"
        style={{ width: columnWidth, height: columnWidth }}
      >
        <Text variant="bodySmDefault" color="gray500">
          Photo
        </Text>
      </Box>
    );
  }

  return (
    <View
      style={[
        styles.imageShell,
        { width: columnWidth, height: imageHeight },
      ]}
    >
      <Image
        source={{ uri: thumbnailUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        recyclingKey={thumbnailUrl}
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.12)", "transparent"]}
        locations={[0, 0.45, 1]}
        style={styles.gradientTop}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)"]}
        style={styles.gradientBottom}
      />

      <View style={styles.overlayTop}>
        <View style={styles.overlayTopLeft}>
          {activity.proposed_by ? (
            <Avatar
              variant="sm"
              seed={activity.proposed_by}
              profilePhoto={proposerProfilePhoto}
            />
          ) : null}
          <Text
            variant="bodySmStrong"
            color="white"
            numberOfLines={1}
            style={styles.overlayName}
          >
            {name}
          </Text>
        </View>
        {timeLabel ? (
          <Text variant="bodySmDefault" color="white">
            {timeLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.overlayBottom}>
        <Pressable
          onPress={onRsvpGoing}
          disabled={rsvpPending || !activity.id}
          hitSlop={8}
          accessibilityLabel="Mark as going"
        >
          <View style={styles.engagementGroup}>
            <Icon icon={Heart} size="xs" color="white" />
            <Text variant="bodySmDefault" color="white">
              {likes}
            </Text>
          </View>
        </Pressable>
        <View style={styles.engagementGroup}>
          <Icon icon={MessageCircle} size="xs" color="white" />
          <Text variant="bodySmDefault" color="white">
            {comments}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MoodBoardLinkPreview({
  thumbnailUrl,
  columnWidth,
}: {
  thumbnailUrl: string;
  columnWidth: number;
}) {
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      thumbnailUrl,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setAspect(w / h);
        }
      },
      () => {
        if (!cancelled) setAspect(1.1);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl]);

  const ar = aspect != null && aspect > 0 ? aspect : 1.1;
  const thumbHeight = columnWidth / ar;

  return (
    <View style={[styles.linkImageShell, { width: columnWidth, height: thumbHeight }]}>
      <Image
        source={{ uri: thumbnailUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        recyclingKey={thumbnailUrl}
      />
    </View>
  );
}

const GRADIENT_TOP_HEIGHT = 72;
const GRADIENT_BOTTOM_HEIGHT = 64;

const styles = StyleSheet.create({
  press: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Layout.spacing.sm,
  },
  card: {
    borderRadius: CornerRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  cardNoteWrap: {
    overflow: "visible",
  },
  noteCardSurface: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  imageShell: {
    overflow: "hidden",
    borderRadius: CornerRadius.lg,
    backgroundColor: ColorPalette.gray100,
  },
  linkImageShell: {
    overflow: "hidden",
    backgroundColor: ColorPalette.gray50,
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: GRADIENT_TOP_HEIGHT,
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: GRADIENT_BOTTOM_HEIGHT,
  },
  overlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: Layout.spacing.sm,
  },
  overlayTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    flex: 1,
    marginRight: Layout.spacing.xs,
    minWidth: 0,
  },
  overlayName: {
    flexShrink: 1,
  },
  overlayBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.sm,
  },
  engagementGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
  },
  linkPlaceholder: {
    width: "100%",
    aspectRatio: 1.1,
    backgroundColor: ColorPalette.gray50,
  },
});
