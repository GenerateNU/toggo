import { useGetPoll } from "@/api/polls/useGetPoll";
import VotePollCard from "@/app/(app)/trips/[id]/polls/components/vote-poll-card";
import { Box, Spinner } from "@/design-system";
import ErrorState from "@/design-system/components/status/error";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet } from "react-native";
import ActivityCardHeader from "./activity-card-header";
import ActivityFeedItem from "./activity-feed-item";
import type { ActivityItemProps } from "../types";

export default function ActivityPollItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: ActivityItemProps) {
  const pollId = event.entity_id ?? "";
  const {
    data: poll,
    isLoading,
    isError,
    refetch,
  } = useGetPoll(tripId, pollId, {
    query: { enabled: !!pollId },
  });

  const handleViewPoll = useCallback(() => {
    if (pollId) {
      router.push({
        pathname: `/trips/${tripId}/polls/${pollId}` as any,
        params: { tripID: tripId },
      });
    }
  }, [tripId, pollId]);

  return (
    <ActivityFeedItem isUnread={isUnread} onMarkRead={onMarkRead}>
      <Box
        backgroundColor="white"
        borderRadius="md"
        overflow="hidden"
        style={styles.cardShadow}
      >
        <Box style={styles.pollCardInner}>
          <ActivityCardHeader
            activityType="poll"
            timestamp={event.timestamp ?? ""}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
            goToLabel="Go to poll"
            onGoTo={handleViewPoll}
          />
          {isError ? (
            <ErrorState
              title="Couldn't load poll"
              description="Give it a moment and try again."
              refresh={refetch}
            />
          ) : isLoading || !poll ? (
            <Box padding="md" alignItems="center">
              <Spinner />
            </Box>
          ) : (
            <VotePollCard
              poll={poll}
              tripId={tripId}
              onVoted={onMarkRead}
              onPress={handleViewPoll}
            />
          )}
        </Box>
      </Box>
    </ActivityFeedItem>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: Layout.spacing.xs,
    elevation: 3,
  },
  pollCardInner: {
    padding: Layout.spacing.sm - Layout.spacing.xxs,
    gap: Layout.spacing.sm - Layout.spacing.xxs,
  },
});
