import { Avatar, Box, Text } from "@/design-system";
import AvatarStack from "@/design-system/components/avatars/avatar-stack";
import { Elevation } from "@/design-system/tokens/elevation";
import type { ModelsPitchAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { Pressable } from "react-native";
import { InlineAudioPlayer } from "./inline-audio-player";

interface PitchCardProps {
  pitch: ModelsPitchAPIResponse;
  onPress: () => void;
  onCommentPress?: () => void;
}

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

  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${datePart} at ${timePart}`;
}

export function PitchCard({ pitch, onPress, onCommentPress }: PitchCardProps) {
  const coverImage = pitch.images?.[0]?.medium_url;
  const commentCount = pitch.comment_count ?? 0;
  const firstCommentTime = formatCommentTimeLabel(
    (pitch.comment_previews?.[0] as { created_at?: string } | undefined)
      ?.created_at ?? pitch.created_at,
  );

  return (
    <Pressable onPress={onPress}>
      <Box
        marginBottom="sm"
        style={{ ...Elevation.md, shadowOffset: { width: 0, height: 0 } }}
      >
        <Box
          borderRadius="lg"
          overflow="hidden"
          backgroundColor="white"
          padding="xs"
        >
          <Box borderRadius="md" overflow="hidden">
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={{ width: "100%", height: 200 }}
                contentFit="cover"
              />
            ) : (
              <Box width="100%" height={200} backgroundColor="gray100" />
            )}
          </Box>

          <Box paddingTop="xs" gap="xs">
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Avatar
                profilePhoto={pitch.profile_picture_url}
                seed={pitch.user_id}
                variant="sm"
              />
              <Text
                variant="headingMd"
                color="gray900"
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {pitch.title}
              </Text>
            </Box>

            {pitch.audio_url ? (
              <InlineAudioPlayer
                audioUrl={pitch.audio_url}
                pitchId={pitch.id ?? ""}
              />
            ) : null}

            <Pressable onPress={onCommentPress}>
              <Box
                flexDirection="row"
                alignItems="center"
                backgroundColor="gray50"
                borderRadius="md"
                paddingHorizontal="xs"
                paddingVertical="xs"
                gap="xs"
              >
                {(pitch.comment_previews?.length ?? 0) > 0 ? (
                  <AvatarStack
                    members={(pitch.comment_previews ?? []).map((p) => ({
                      userId: p.user_id ?? "",
                      profilePhotoUrl: p.profile_picture_url,
                      name: p.name,
                    }))}
                    maxVisible={3}
                    showName={false}
                  />
                ) : null}

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
        </Box>
      </Box>
    </Pressable>
  );
}
