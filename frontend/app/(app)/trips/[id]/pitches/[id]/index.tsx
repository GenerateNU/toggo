import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useGetPitch } from "@/api/pitches/useGetPitch";
import { useUser } from "@/contexts/user";
import { Box, Divider, Icon, Text } from "@/design-system";
import AvatarStack from "@/design-system/components/avatars/avatar-stack";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import { modelsEntityType } from "@/types/types.gen";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { ExternalLink, MessageCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InlineAudioPlayer } from "../components/inline-audio-player";
import { PitchedBy } from "../components/pitched-by";

export default function PitchDetail() {
  const { id: pitchID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();
  const { data: pitch, isLoading } = useGetPitch(tripID!, pitchID!);
  const { currentUser } = useUser();
  const [commentSectionVisible, setCommentSectionVisible] = useState(false);

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID: tripID!,
    entityType: modelsEntityType.PitchEntity,
    entityID: pitchID!,
    enabled: !!pitchID && !!tripID,
  });

  const commenters = useMemo(() => {
    const seen = new Set<string>();
    return comments
      .filter((c) => {
        const key = c.authorSeed ?? c.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c) => ({
        userId: c.authorSeed ?? c.id,
        profilePhotoUrl: c.authorAvatar,
        username: c.authorName,
      }));
  }, [comments]);

  const coverImage = pitch?.images?.[0]?.medium_url;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
        <Stack.Screen options={{ headerTitle: "Pitch" }} />
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
      <Stack.Screen options={{ headerTitle: pitch?.title ?? "Pitch" }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Box paddingHorizontal="sm" paddingTop="sm">
          <Box borderRadius="xl" overflow="hidden">
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImage}
                contentFit="cover"
              />
            ) : (
              <Box style={styles.coverPlaceholder} backgroundColor="gray100" />
            )}
          </Box>
        </Box>

        <Box backgroundColor="white" padding="sm" gap="sm">
          <Box gap="xs">
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Text
                variant="headingMd"
                color="gray900"
                style={{ flex: 1 }}
                numberOfLines={2}
              >
                {pitch?.title}
              </Text>
              <PitchedBy
                userId={pitch?.user_id}
                profilePhotoUrl={pitch?.profile_picture_url}
              />
            </Box>

            {pitch?.description ? (
              <Text variant="bodySmDefault" color="gray700">
                {pitch.description}
              </Text>
            ) : null}
          </Box>

          {pitch?.audio_url ? (
            <Box gap="xs">
              <Divider />
              <Text variant="bodySmDefault" color="gray900">
                Audio Pitch
              </Text>
              <InlineAudioPlayer
                audioUrl={pitch.audio_url}
                pitchId={pitch.id ?? ""}
              />
            </Box>
          ) : null}

          {(pitch?.links?.length ?? 0) > 0 && (
            <>
              <Box gap="xs">
                <Text variant="bodySmDefault" color="gray900">
                  Helpful Links
                </Text>
                {pitch!.links!.map((link) => (
                  <Pressable
                    key={link.id}
                    onPress={() => link.url && Linking.openURL(link.url)}
                    style={({ pressed }) => [
                      styles.linkCardPressable,
                      pressed && Platform.OS !== "android"
                        ? styles.linkCardPressed
                        : null,
                    ]}
                    android_ripple={{ color: ColorPalette.gray100 }}
                    hitSlop={4}
                  >
                    <Box
                      borderRadius="md"
                      overflow="hidden"
                      backgroundColor="gray50"
                    >
                      {link.thumbnail_url ? (
                        <Box
                          paddingHorizontal="xs"
                          paddingTop="xs"
                          marginBottom="xs"
                        >
                          <Box borderRadius="md" overflow="hidden">
                            <Image
                              source={{ uri: link.thumbnail_url }}
                              style={styles.linkThumb}
                              contentFit="cover"
                            />
                          </Box>
                        </Box>
                      ) : null}
                      <Box
                        padding="sm"
                        flexDirection="row"
                        alignItems="center"
                        gap="xs"
                      >
                        <ExternalLink size={14} color={ColorPalette.gray500} />
                        <Box flex={1}>
                          <Text
                            variant="bodyXsMedium"
                            color="gray900"
                            numberOfLines={1}
                          >
                            {link.title ?? link.domain ?? link.url}
                          </Text>
                          {link.domain ? (
                            <Text
                              variant="bodyXsDefault"
                              color="gray500"
                              numberOfLines={1}
                            >
                              {link.domain}
                            </Text>
                          ) : null}
                        </Box>
                      </Box>
                    </Box>
                  </Pressable>
                ))}
              </Box>
            </>
          )}

          <Pressable onPress={() => setCommentSectionVisible(true)}>
            <Box flexDirection="row" alignItems="center" gap="xs">
              {commenters.length > 0 ? (
                <AvatarStack
                  members={commenters}
                  maxVisible={3}
                  showName={false}
                />
              ) : (
                <Icon icon={MessageCircle} size="xs" color="gray400" />
              )}
              <Text variant="bodyXsDefault" color="gray500">
                {comments.length === 0
                  ? "No comments yet"
                  : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
              </Text>
            </Box>
          </Pressable>
        </Box>
      </ScrollView>

      <CommentSection
        visible={commentSectionVisible}
        onClose={() => setCommentSectionVisible(false)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={currentUser?.id ?? ""}
        currentUserName={currentUser?.username ?? currentUser?.name ?? ""}
        currentUserAvatar={currentUser?.profile_picture}
        currentUserSeed={currentUser?.id}
        onSubmitComment={onSubmitComment}
        onReact={onReact}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  coverImage: {
    width: "100%",
    height: 240,
  },
  coverPlaceholder: {
    width: "100%",
    height: 240,
  },
  linkThumb: {
    width: "100%",
    height: 140,
  },
  linkCardPressable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  linkCardPressed: {
    opacity: 0.85,
  },
});
