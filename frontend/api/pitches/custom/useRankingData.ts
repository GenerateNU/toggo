import { useMemo } from "react";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
  ModelsRankPollResultsResponse,
  ModelsUserRankingItem,
} from "@/types/types.gen";

const RANKING_SLOT_COUNT = 3;

export interface RankedPitchItem {
  option: ModelsOptionWithScore;
  pitch: ModelsPitchAPIResponse;
}

interface UseRankingDataParams {
  pitches: ModelsPitchAPIResponse[];
  pollResults: ModelsRankPollResultsResponse | undefined;
}

export function useRankingData({ pitches, pollResults }: UseRankingDataParams) {
  return useMemo(() => {
    const pitchById = new Map<string, ModelsPitchAPIResponse>();
    for (const pitch of pitches) {
      if (pitch.id) {
        pitchById.set(pitch.id, pitch);
      }
    }

    const sortedOptions = [...(pollResults?.all_options ?? [])].sort(
      (a, b) => (b.borda_score ?? 0) - (a.borda_score ?? 0),
    );

    const rankedPitches: RankedPitchItem[] = [];
    for (const option of sortedOptions) {
      const pitchId = option.entity_id;
      if (!pitchId) continue;

      const pitch = pitchById.get(pitchId);
      if (!pitch) continue;

      rankedPitches.push({ option, pitch });
    }

    const userRankingCount = pollResults?.user_ranking?.length ?? 0;
    const unrankedCount = Math.max(
      0,
      Math.min(RANKING_SLOT_COUNT, pitches.length) - userRankingCount,
    );

    return {
      rankedPitches,
      unrankedCount,
      userRankingCount,
      totalVoters: pollResults?.total_voters ?? 0,
      userHasVoted: !!pollResults?.user_has_voted,
      pollOptions: pollResults?.all_options ?? [],
      userRanking: (pollResults?.user_ranking ?? []) as ModelsUserRankingItem[],
    };
  }, [pitches, pollResults]);
}
