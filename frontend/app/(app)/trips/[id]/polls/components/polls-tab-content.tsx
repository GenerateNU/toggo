import { useGetPollsByTripID } from "@/api/polls/useGetPollsByTripID";
import { Box, ErrorState, Spinner, Text } from "@/design-system";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import PollDetailSheet from "./poll-detail-sheet";
import RankPollRow from "./rank-poll-row";
import VotePollCard from "./vote-poll-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type PollsTabContentProps = {
  tripId: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PollsTabContent({ tripId }: PollsTabContentProps) {
  const {
    data: pollsData,
    isLoading,
    isError,
    refetch,
  } = useGetPollsByTripID(tripId, {}, { query: { enabled: !!tripId } });

  const [detailPoll, setDetailPoll] = useState<ModelsPollAPIResponse | null>(
    null,
  );

  const polls = pollsData?.items ?? [];
  const votePolls = polls.filter((p) => p.poll_type !== "rank");
  const rankPolls = polls.filter((p) => p.poll_type === "rank");

  const handleVoted = useCallback(() => refetch(), [refetch]);
  const handleRanked = useCallback(() => refetch(), [refetch]);

  if (isLoading) {
    return (
      <Box alignItems="center" paddingVertical="xl">
        <Spinner />
      </Box>
    );
  }

  if (isError) {
    return <ErrorState title="Couldn't load polls" refresh={refetch} />;
  }

  if (polls.length === 0) {
    return (
      <Box borderWidth={1} borderColor="gray200" borderRadius="xl" padding="sm">
        <Box alignItems="center" paddingVertical="lg">
          <Text
            variant="bodyDefault"
            color="gray950"
            style={styles.emptyStateText}
          >
            No polls yet. Create one!
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box gap="sm">
        {votePolls.map((poll, index) => (
          <VotePollCard
            key={poll.id ?? `vote-poll-${index}`}
            poll={poll}
            tripId={tripId}
            onVoted={handleVoted}
            onPress={() => setDetailPoll(poll)}
          />
        ))}
        {rankPolls.map((poll, index) => (
          <RankPollRow
            key={poll.id ?? `rank-poll-${index}`}
            poll={poll}
            tripId={tripId}
            onRanked={handleRanked}
            onPress={() => setDetailPoll(poll)}
          />
        ))}
      </Box>

      <PollDetailSheet
        poll={detailPoll}
        tripId={tripId}
        visible={detailPoll !== null}
        onClose={() => setDetailPoll(null)}
        onRefresh={refetch}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyStateText: {
    fontStyle: "italic",
  },
});

export default PollsTabContent;
