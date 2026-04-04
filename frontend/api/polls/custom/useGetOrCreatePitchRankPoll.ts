import fetchClient from "../../client";
import { createRankPoll } from "../useCreateRankPoll";
import type {
  ModelsPitchAPIResponse,
  ModelsRankPollAPIResponse,
} from "@/types/types.gen";
import { useQuery } from "@tanstack/react-query";

const RANK_POLL_QUESTION = "Rank your top destinations";
const PITCH_OPTION_TYPE = "entity" as const;
const PITCH_ENTITY_TYPE = "pitch";

async function fetchRankPolls(
  tripID: string,
): Promise<ModelsRankPollAPIResponse[]> {
  try {
    const res = await fetchClient<
      ModelsRankPollAPIResponse[],
      unknown,
      unknown
    >({
      method: "GET",
      url: `/api/v1/trips/${tripID}/rank-polls`,
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}

async function getOrCreatePitchRankPoll(
  tripID: string,
  pitches: ModelsPitchAPIResponse[],
): Promise<string | null> {
  const polls = await fetchRankPolls(tripID);

  if (polls.length > 0) {
    return polls[0]?.id ?? null;
  }

  const options = pitches.map((p) => ({
    entity_id: p.id!,
    entity_type: PITCH_ENTITY_TYPE,
    name: p.title!,
    option_type: PITCH_OPTION_TYPE,
  }));

  const created = await createRankPoll(tripID, {
    poll_type: "rank",
    question: RANK_POLL_QUESTION,
    options,
  });

  return created?.id ?? null;
}

export function useGetOrCreatePitchRankPoll(
  tripID: string,
  pitches: ModelsPitchAPIResponse[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["pitchRankPoll", tripID],
    queryFn: () => getOrCreatePitchRankPoll(tripID, pitches),
    staleTime: Infinity,
    enabled: enabled && !!tripID && pitches.length > 0,
  });
}
