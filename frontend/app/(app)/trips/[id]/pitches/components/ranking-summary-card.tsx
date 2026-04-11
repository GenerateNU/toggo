import { Avatar, Box, Button, Icon, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Elevation } from "@/design-system/tokens/elevation";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
} from "@/types/types.gen";
import { Image } from "expo-image";
import { ChevronDown, ChevronUp, UsersRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { LayoutAnimation, Platform, Pressable, UIManager } from "react-native";

const COVER_IMAGE_HEIGHT = 200;

const RANK_CHOICE_LABELS: Record<number, string> = {
  1: "#1 Choice",
  2: "#2 Choice",
  3: "#3 Choice",
};

interface RankingSummaryCardProps {
  pitch: ModelsPitchAPIResponse;
  option: ModelsOptionWithScore;
  rank: number;
  totalVoters: number;
  isFirst: boolean;
  onPress?: () => void;
  onSetDestination?: () => void;
  onOpenVoters?: (
    position: number,
    count: number,
    pitch: ModelsPitchAPIResponse,
    optionID?: string,
  ) => void;
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <Box
      borderRadius="lg"
      borderWidth={1}
      backgroundColor="brand50"
      borderColor="brand200"
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="xs"
      paddingVertical="xxs"
      gap="xxs"
    >
      <Text variant="headingMd" color="brand800">
        #{rank}
      </Text>
    </Box>
  );
}

function RankRow({
  position,
  count,
  totalVoters,
  onOpenVoters,
}: {
  position: number;
  count: number;
  totalVoters: number;
  onOpenVoters?: (position: number, count: number) => void;
}) {
  const fillPercent = totalVoters > 0 ? (count / totalVoters) * 100 : 0;
  const barColors: Record<number, string> = {
    1: ColorPalette.brand500,
    2: ColorPalette.brand400,
    3: ColorPalette.brand200,
  };

  return (
    <Box gap="xs">
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="bodyXsMedium" color="gray500">
          {RANK_CHOICE_LABELS[position]}
        </Text>
        <Pressable onPress={() => onOpenVoters?.(position, count)}>
          <Box
            flexDirection="row"
            alignItems="center"
            gap="xxs"
            backgroundColor="gray50"
            borderRadius="full"
            paddingHorizontal="sm"
            paddingVertical="xxs"
          >
            <Icon icon={UsersRound} size="xs" color="gray500" />
            <Text variant="bodyXsDefault" color="blue500">
              {count}
            </Text>
          </Box>
        </Pressable>
      </Box>
      <Box
        height={6}
        borderRadius="sm"
        backgroundColor="gray50"
        overflow="hidden"
      >
        <Box
          borderRadius="xs"
          style={[
            {
              height: "100%",
              width: `${fillPercent}%`,
              backgroundColor: barColors[position],
            },
          ]}
        />
      </Box>
    </Box>
  );
}

export function RankingSummaryCard({
  pitch,
  option,
  rank,
  totalVoters,
  isFirst,
  onPress,
  onSetDestination,
  onOpenVoters,
}: RankingSummaryCardProps) {
  const coverImage = pitch.images?.[0]?.medium_url;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <Box
      marginHorizontal="sm"
      marginBottom="sm"
      style={{ ...Elevation.md, shadowOffset: { width: 0, height: 0 } }}
    >
      <Box backgroundColor="white" borderRadius="xl" overflow="hidden">
        <Pressable onPress={onPress} disabled={!onPress}>
          <Box paddingHorizontal="xs" paddingTop="xs">
            <Box borderRadius="lg" overflow="hidden">
              {coverImage ? (
                <Image
                  source={{ uri: coverImage }}
                  style={{ width: "100%", height: COVER_IMAGE_HEIGHT }}
                  contentFit="cover"
                />
              ) : (
                <Box
                  width="100%"
                  height={COVER_IMAGE_HEIGHT}
                  backgroundColor="gray100"
                />
              )}
            </Box>
            <Box position="absolute" top={20} left={20}>
              <RankBadge rank={rank} />
            </Box>
          </Box>
        </Pressable>

        <Box
          paddingHorizontal="xs"
          paddingTop="sm"
          paddingBottom={expanded ? undefined : "sm"}
          gap="sm"
        >
          <Pressable onPress={toggleExpanded}>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Avatar
                profilePhoto={pitch.profile_picture_url}
                seed={pitch.user_id}
                variant="sm"
              />
              <Text
                variant="headingMd"
                color="gray900"
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {pitch.title}
              </Text>
              <Icon
                icon={expanded ? ChevronUp : ChevronDown}
                size="sm"
                color="gray500"
              />
            </Box>
          </Pressable>

          {expanded ? <Box height={1} backgroundColor="gray50" /> : null}

          {expanded ? (
            <Box gap="md" paddingBottom="xs">
              {[1, 2, 3].map((position) => (
                <RankRow
                  key={position}
                  position={position}
                  count={option.rank_breakdown?.[position] ?? 0}
                  totalVoters={totalVoters}
                  onOpenVoters={(pos, count) =>
                    onOpenVoters?.(pos, count, pitch, option.option_id)
                  }
                />
              ))}

              {isFirst && (
                <Button
                  variant="Blue"
                  layout="textOnly"
                  label="Set as Destination"
                  onPress={onSetDestination}
                />
              )}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
