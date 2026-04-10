import { useGetRankPollResults } from "@/api/polls/useGetRankPollResults";
import { Box, ErrorState } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import { ActivityIndicator, StyleSheet } from "react-native";
import RankPollCard from "./rank-poll-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type RankPollRowProps = {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onRanked: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RankPollRow({ poll, tripId, onRanked }: RankPollRowProps) {
  const { data, isLoading, isError, refetch } = useGetRankPollResults(
    tripId,
    poll.id ?? "",
    { query: { enabled: !!(tripId && poll.id) } },
  );

  if (isLoading) {
    return (
      <Box
        backgroundColor="white"
        borderRadius="md"
        alignItems="center"
        padding="lg"
        style={styles.loadingCard}
      >
        <ActivityIndicator color={ColorPalette.brand500} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box backgroundColor="white" borderRadius="md" style={styles.loadingCard}>
        <ErrorState title="Couldn't load poll" refresh={refetch} />
      </Box>
    );
  }

  if (!data) return null;

  return <RankPollCard poll={data} tripId={tripId} onRanked={onRanked} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingCard: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
});

export default RankPollRow;
