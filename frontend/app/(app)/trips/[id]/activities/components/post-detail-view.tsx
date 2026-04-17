import { useActivityRsvpGoing } from "@/api/activities/custom/useActivityRsvpGoing";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useUser } from "@/contexts/user";
import { Avatar, Box, Icon, Spinner, Text, useToast } from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { modelsEntityType, modelsRSVPStatus } from "@/types/types.gen";
import {
  getActivityExternalMediaLinkUrl,
  getActivityProposerProfilePictureUrl,
  getActivityThumbnailUrl,
} from "@/utils/activity-helpers";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { ChevronLeft, Heart, Link2, MessageCircle, MoreHorizontal } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Image as RNImage,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function displayName(activity: ModelsActivityAPIResponse | undefined): string {
  if (!activity) return "Member";
  const u = activity.proposer_username?.trim();
  if (u) return u.split(/\s+/)[0] ?? u;
  const n = activity.proposer_name?.trim();
  if (n) return n.split(/\s+/)[0] ?? n;
  return "Member";
}

type PostDetailViewProps = {
  activity: ModelsActivityAPIResponse;
  tripID: string;
  activityID: string;
  openComments?: boolean;
};

export function PostDetailView({
  activity,
  tripID,
  activityID,
  openComments = false,
}: PostDetailViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { currentUser } = useUser();
  const toast = useToast();
  const rsvpMutation = useActivityRsvpGoing(tripID);

  const [commentSectionVisible, setCommentSectionVisible] = useState(openComments);
  const [heroAspect, setHeroAspect] = useState<number | null>(null);

  const isGoing = useMemo(() => {
    if (!currentUser?.id || !activity.going_users) return false;
    return activity.going_users.some((u) => u.user_id === currentUser.id);
  }, [currentUser?.id, activity.going_users]);

  const thumbnailUrl = getActivityThumbnailUrl(activity);
  const externalLinkUrl = useMemo(
    () => getActivityExternalMediaLinkUrl(activity),
    [activity],
  );

  const horizontalPad = Layout.spacing.sm;
  const contentWidth = windowWidth - horizontalPad * 2;

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID,
    entityType: modelsEntityType.ActivityEntity,
    entityID: activityID,
    enabled: !!(tripID && activityID),
  });

  const commentDisplayCount = useMemo(() => {
    const fromApi = activity.comment_count ?? 0;
    const loaded = comments.length;
    return Math.max(fromApi, loaded);
  }, [activity.comment_count, comments.length]);

  useEffect(() => {
    if (!thumbnailUrl?.trim()) {
      setHeroAspect(null);
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      thumbnailUrl,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setHeroAspect(w / h);
      },
      () => {
        if (!cancelled) setHeroAspect(16 / 9);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl]);

  const heroHeight =
    heroAspect != null && heroAspect > 0
      ? contentWidth / heroAspect
      : contentWidth * 0.56;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <Stack.Screen
        options={{
          headerTitle: "Post",
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: styles.headerSolid,
          headerBackVisible: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={styles.headerIconHit}
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={24} color={ColorPalette.gray900} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              hitSlop={8}
              style={styles.headerIconHit}
              accessibilityLabel="More options"
            >
              <MoreHorizontal size={22} color={ColorPalette.gray900} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Layout.spacing.md) + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {thumbnailUrl ? (
          <Box paddingHorizontal="sm" paddingTop="sm">
            <Box borderRadius="xl" overflow="hidden" backgroundColor="gray100">
              <Image
                source={{ uri: thumbnailUrl }}
                style={{ width: contentWidth, height: heroHeight }}
                contentFit="contain"
              />
            </Box>
          </Box>
        ) : null}

        <Box
          paddingHorizontal="sm"
          paddingTop={thumbnailUrl ? "md" : "lg"}
          gap="md"
          backgroundColor="white"
        >
          {/* Author row: avatar + name | heart + comment */}
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
              marginRight="sm"
            >
              <Avatar
                profilePhoto={getActivityProposerProfilePictureUrl(activity)}
                seed={activity.proposed_by}
                variant="md"
              />
              <Text
                variant="bodyStrong"
                color="gray950"
                numberOfLines={1}
                style={styles.flexShrink}
              >
                {displayName(activity)}
              </Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="md">
              <Pressable
                onPress={() => {
                  if (!activity.id) return;
                  rsvpMutation.mutate(
                    {
                      tripID,
                      activityID: activity.id,
                      data: {
                        status: isGoing
                          ? modelsRSVPStatus.RSVPStatusNotGoing
                          : modelsRSVPStatus.RSVPStatusGoing,
                      },
                    },
                    {
                      onError: () =>
                        toast.show({ message: "Could not update going status." }),
                    },
                  );
                }}
                disabled={!activity.id || rsvpMutation.isPending}
                hitSlop={8}
                accessibilityLabel="Mark as going"
              >
                <Box flexDirection="row" alignItems="center" gap="xxs">
                  <Heart
                    size={20}
                    color={isGoing ? ColorPalette.brand500 : ColorPalette.gray900}
                    fill={isGoing ? ColorPalette.brand500 : "none"}
                  />
                  <Text variant="bodySmDefault" color={isGoing ? "brand500" : "gray900"}>
                    {activity.going_count ?? 0}
                  </Text>
                </Box>
              </Pressable>
              <Pressable
                onPress={() => setCommentSectionVisible(true)}
                hitSlop={6}
              >
                <Box flexDirection="row" alignItems="center" gap="xxs">
                  <Icon icon={MessageCircle} size="sm" color="gray900" />
                  <Text variant="bodySmDefault" color="gray900">
                    {commentDisplayCount}
                  </Text>
                </Box>
              </Pressable>
            </Box>
          </Box>

          {/* Description */}
          {activity.description ? (
            <Text variant="bodyDefault" color="gray900">
              {activity.description}
            </Text>
          ) : null}

          {/* External link card */}
          {externalLinkUrl ? (
            <Pressable
              onPress={async () => {
                try {
                  await Linking.openURL(externalLinkUrl);
                } catch {
                  toast.show({ message: "Could not open link." });
                }
              }}
              accessibilityRole="link"
              accessibilityLabel="Open link in browser"
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="sm"
                padding="sm"
                borderRadius="lg"
                style={styles.externalLinkCard}
              >
                <Icon icon={Link2} size="sm" color="blue500" />
                <Text
                  variant="bodySmDefault"
                  color="blue500"
                  numberOfLines={2}
                  style={styles.externalLinkLabel}
                >
                  {(activity.media_url ?? externalLinkUrl).replace(
                    /^https?:\/\//i,
                    "",
                  )}
                </Text>
              </Box>
            </Pressable>
          ) : null}

          {/* Timestamp */}
          {activity.created_at ? (
            <Text variant="bodyXsDefault" color="gray500">
              {formatRelativeTime(activity.created_at)}
            </Text>
          ) : null}
        </Box>
      </ScrollView>

      {/* Comments peek bar */}
      {!commentSectionVisible && (
        <Pressable
          onPress={() => setCommentSectionVisible(true)}
          style={[
            styles.commentsPeek,
            { bottom: -Math.max(insets.bottom - 12, 0) },
          ]}
        >
          <Box style={styles.commentsPeekHandle} />
          <Text variant="bodySmStrong" color="gray900">
            Comments
          </Text>
        </Pressable>
      )}

      <CommentSection
        visible={commentSectionVisible}
        onClose={() => setCommentSectionVisible(false)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={currentUser?.id ?? ""}
        currentUserName={currentUser?.name ?? ""}
        currentUserAvatar={currentUser?.profile_picture}
        currentUserSeed={currentUser?.id}
        onSubmitComment={onSubmitComment}
        onReact={onReact}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  headerSolid: {
    backgroundColor: ColorPalette.white,
  },
  headerIconHit: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    width: 40,
    marginRight: 4,
  },
  flexShrink: {
    flexShrink: 1,
  },
  externalLinkCard: {
    backgroundColor: ColorPalette.blue25,
    borderWidth: 1,
    borderColor: ColorPalette.blue200,
  },
  externalLinkLabel: {
    flex: 1,
  },
  commentsPeek: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 74,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  commentsPeekHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: ColorPalette.gray300,
    marginBottom: 10,
  },
});
