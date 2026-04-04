import { Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Elevation } from "@/design-system/tokens/elevation";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
} from "@/types/types.gen";
import { Image } from "expo-image";
import { Medal } from "lucide-react-native";
import { Pressable } from "react-native";
import { PitchedBy } from "./pitched-by";

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
}

function RankBadge({ rank }: { rank: number }) {
  const isTopRank = rank === 1;

  return (
    <Box
      borderRadius="sm"
      borderWidth={1}
      backgroundColor="brand50"
      borderColor="brand200"
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="xs"
      paddingVertical="xxs"
      gap="xxs"
    >
      {isTopRank ? (
        <Box width={30} height={30} alignItems="center" justifyContent="center">
          <Medal size={24} color={ColorPalette.brand500} />
        </Box>
      ) : null}
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
}: {
  position: number;
  count: number;
  totalVoters: number;
}) {
  const fillPercent = totalVoters > 0 ? (count / totalVoters) * 100 : 0;
  const label = count === 1 ? "person" : "people";
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
        <Text variant="bodySmMedium" color="gray700">
          {RANK_CHOICE_LABELS[position]}
        </Text>
        <Box
          backgroundColor="gray50"
          borderRadius="full"
          paddingHorizontal="sm"
          paddingVertical="xxs"
        >
          <Text variant="bodySmMedium" color="gray700">
            {count} {label}
          </Text>
        </Box>
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
}: RankingSummaryCardProps) {
  const coverImage = pitch.images?.[0]?.medium_url;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Box
        marginHorizontal="sm"
        marginBottom="sm"
        style={{ ...Elevation.md, shadowOffset: { width: 0, height: 0 } }}
      >
        <Box backgroundColor="white" borderRadius="xl" overflow="hidden">
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

          <Box paddingHorizontal="sm" paddingTop="md" gap="sm">
            <Box flexDirection="row" alignItems="center">
              <Text
                variant="headingSm"
                color="gray900"
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {pitch.title}
              </Text>
              <PitchedBy
                userId={pitch.user_id}
                profilePhotoUrl={pitch.profile_picture_url}
              />
            </Box>

            <Box height={1} backgroundColor="gray50" />

            <Box gap="md" paddingBottom="md">
              {[1, 2, 3].map((position) => (
                <RankRow
                  key={position}
                  position={position}
                  count={option.rank_breakdown?.[position] ?? 0}
                  totalVoters={totalVoters}
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
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
}
