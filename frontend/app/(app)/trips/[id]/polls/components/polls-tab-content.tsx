import { useGetPollsByTripID } from "@/api/polls/useGetPollsByTripID";
import { Box, ErrorState, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useCallback } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
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

  const polls = pollsData?.items ?? [];
  const votePolls = polls.filter((p) => p.poll_type !== "rank");
  const rankPolls = polls.filter((p) => p.poll_type === "rank");

  const handleVoted = useCallback(() => refetch(), [refetch]);
  const handleRanked = useCallback(() => refetch(), [refetch]);

  if (isLoading) {
    return (
      <Box alignItems="center" paddingVertical="xl">
        <ActivityIndicator color={ColorPalette.brand500} />
      </Box>
    );
  }

  if (isError) {
    return <ErrorState title="Couldn't load polls" />;
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
    <Box gap="sm">
      {votePolls.map((poll) => (
        <VotePollCard
          key={poll.id}
          poll={poll}
          tripId={tripId}
          onVoted={handleVoted}
        />
      ))}
      {rankPolls.map((poll) => (
        <RankPollRow
          key={poll.id}
          poll={poll}
          tripId={tripId}
          onRanked={handleRanked}
        />
      ))}
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyStateText: {
    fontStyle: "italic",
  },
});

export default PollsTabContent;
