import type { RankedPitchItem } from "@/api/pitches/custom/useRankingData";
import { Box, Icon, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { ArrowUpDown, ChevronRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView } from "react-native";
import { RankingSummaryCard } from "./ranking-summary-card";

interface RankingTabContentProps {
  unrankedCount: number;
  userHasVoted: boolean;
  userRankingCount: number;
  totalVoters: number;
  rankedPitches: RankedPitchItem[];
  pollId: string | null | undefined;
  hasPitches: boolean;
  onOpenRankingSheet: () => void;
  onOpenPitch: (pitchID: string) => void;
}

export function RankingTabContent({
  unrankedCount,
  userHasVoted,
  userRankingCount,
  totalVoters,
  rankedPitches,
  pollId,
  hasPitches,
  onOpenRankingSheet,
  onOpenPitch,
}: RankingTabContentProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      <Pressable onPress={onOpenRankingSheet}>
        <Box
          backgroundColor="gray50"
          flexDirection="row"
          alignItems="center"
          padding="sm"
          marginHorizontal="sm"
          marginBottom="sm"
          gap="sm"
          borderRadius="lg"
          borderWidth={1}
          borderColor="gray200"
        >
          <Box
            width={44}
            height={44}
            borderRadius="md"
            backgroundColor="gray100"
            alignItems="center"
            justifyContent="center"
          >
            <Icon icon={ArrowUpDown} size="sm" color="gray900" />
          </Box>
          <Box flex={1}>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Text variant="bodySmMedium" color="gray900">
                My ranking
              </Text>
              {unrankedCount > 0 && (
                <Box
                  backgroundColor="blue25"
                  borderRadius="full"
                  paddingHorizontal="xs"
                  paddingVertical="xxs"
                >
                  <Text
                    variant="bodyXxsMedium"
                    style={{ color: ColorPalette.blue500 }}
                  >
                    {unrankedCount} new
                  </Text>
                </Box>
              )}
            </Box>
            <Text variant="bodyXxsDefault" color="gray500">
              {userHasVoted
                ? `You've ranked ${userRankingCount} locations • Update anytime`
                : "Tap to rank your top 3"}
            </Text>
          </Box>
          <Icon icon={ChevronRight} size="sm" color="gray900" />
        </Box>
      </Pressable>

      <Box paddingHorizontal="sm" paddingBottom="md" paddingVertical="xs">
        <Text variant="bodySmMedium" color="gray900">
          Ranking Summary
        </Text>
      </Box>

      {rankedPitches.map(({ pitch, option }, index) => (
        <RankingSummaryCard
          key={pitch.id}
          pitch={pitch}
          option={option}
          rank={index + 1}
          totalVoters={totalVoters}
          isFirst={index === 0}
          onPress={() => pitch.id && onOpenPitch(pitch.id)}
        />
      ))}

      {!pollId && hasPitches && (
        <Box padding="md" alignItems="center">
          <ActivityIndicator />
        </Box>
      )}
    </ScrollView>
  );
}
