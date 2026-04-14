import { useGetRankPollResults } from "@/api/polls/useGetRankPollResults";
import { Box, ErrorState, Spinner } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import { StyleSheet } from "react-native";
import RankPollCard from "./rank-poll-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type RankPollRowProps = {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onRanked: () => void;
  onPress?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RankPollRow({
  poll,
  tripId,
  onRanked,
  onPress,
}: RankPollRowProps) {
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
        <Spinner />
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

  return (
    <RankPollCard
      poll={data}
      tripId={tripId}
      onRanked={onRanked}
      onPress={onPress}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingCard: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
});

export default RankPollRow;
