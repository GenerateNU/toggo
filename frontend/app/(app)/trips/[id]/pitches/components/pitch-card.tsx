import { Box, Text } from "@/design-system";
import AvatarStack from "@/design-system/components/avatars/avatar-stack";
import { Elevation } from "@/design-system/tokens/elevation";
import { useTheme } from "@/design-system/tokens/theme";
import type { ModelsPitchAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { Play } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";
import { AudioPlayerSheet } from "../[id]/components/audio-player-sheet";
import { getPitchBarHeights } from "../utils/waveform";
import { PitchedBy } from "./pitched-by";

interface PitchCardProps {
  pitch: ModelsPitchAPIResponse;
  onPress: () => void;
  onCommentPress?: () => void;
}

const BAR_COUNT = 50;

export function PitchCard({ pitch, onPress, onCommentPress }: PitchCardProps) {
  const theme = useTheme();
  const coverImage = pitch.images?.[0]?.medium_url;
  const barHeights = getPitchBarHeights(pitch.id ?? "", BAR_COUNT);
  const [audioSheetVisible, setAudioSheetVisible] = useState(false);
  const commentCount = pitch.comment_count ?? 0;

  return (
    <>
      <Pressable onPress={onPress}>
        <Box
          marginHorizontal="sm"
          marginBottom="sm"
          style={{ ...Elevation.md, shadowOffset: { width: 0, height: 0 } }}
        >
          <Box borderRadius="lg" overflow="hidden" backgroundColor="white">
            <Box paddingHorizontal="xs" paddingTop="xs">
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
            </Box>

            <Box
              paddingHorizontal="xs"
              paddingTop="sm"
              paddingBottom="sm"
              gap="xs"
            >
              <Box flexDirection="row" alignItems="center">
                <Box flex={1}>
                  <Text
                    variant="bodySmMedium"
                    color="gray900"
                    numberOfLines={1}
                  >
                    {pitch.title}
                  </Text>
                </Box>
                <PitchedBy
                  userId={pitch.user_id}
                  profilePhotoUrl={pitch.profile_picture_url}
                  username={pitch.username}
                />
              </Box>

              {pitch.audio_url ? (
                <Pressable onPress={() => setAudioSheetVisible(true)}>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    gap="xs"
                    backgroundColor="gray100"
                    borderRadius="md"
                    paddingHorizontal="xs"
                    paddingVertical="xs"
                  >
                    <Box
                      width={36}
                      height={36}
                      borderRadius="full"
                      backgroundColor="gray900"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Play
                        size={14}
                        color={theme.colors.white}
                        fill={theme.colors.white}
                      />
                    </Box>
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                      flex={1}
                      height={40}
                    >
                      {barHeights.map((h: number, i: number) => (
                        <Box
                          key={i}
                          width={2}
                          height={h}
                          borderRadius="xs"
                          backgroundColor="gray400"
                        />
                      ))}
                    </Box>
                  </Box>
                </Pressable>
              ) : null}

              <Pressable onPress={onCommentPress}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                  backgroundColor="gray100"
                  borderRadius="md"
                  paddingHorizontal="xs"
                  paddingVertical="xs"
                >
                  {(pitch.comment_previews?.length ?? 0) > 0 ? (
                    <AvatarStack
                      members={(pitch.comment_previews ?? []).map((p) => ({
                        userId: p.user_id ?? "",
                        profilePhotoUrl: p.profile_picture_url,
                        username: p.username,
                      }))}
                      maxVisible={3}
                      showName={false}
                    />
                  ) : null}
                  <Text variant="bodySmMedium" color="gray600">
                    {commentCount === 0
                      ? "No comments yet"
                      : `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
                  </Text>
                </Box>
              </Pressable>
            </Box>
          </Box>
        </Box>
      </Pressable>

      {pitch.audio_url ? (
        <AudioPlayerSheet
          visible={audioSheetVisible}
          onClose={() => setAudioSheetVisible(false)}
          audioUrl={pitch.audio_url}
          pitchId={pitch.id ?? ""}
          username={pitch.username}
          profilePictureUrl={pitch.profile_picture_url}
          userId={pitch.user_id}
        />
      ) : null}
    </>
  );
}
