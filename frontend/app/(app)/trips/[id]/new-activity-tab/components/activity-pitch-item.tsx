import { useGetPitch } from "@/api/pitches/useGetPitch";
import { Box } from "@/design-system";
import ErrorState from "@/design-system/components/status/error";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { router } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import ActivityFeedItem from "./activity-feed-item";
import ActivityPitchCard from "./activity-pitch-card";
import type { ActivityItemProps } from "../types";

export default function ActivityPitchItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: ActivityItemProps) {
  const pitchId = event.entity_id ?? "";
  const {
    data: pitch,
    isLoading,
    isError,
    refetch,
  } = useGetPitch(tripId, pitchId, {
    query: { enabled: !!pitchId },
  });

  const handleViewPitch = useCallback(() => {
    if (pitchId) {
      router.push({
        pathname: `/trips/${tripId}/pitches/${pitchId}` as any,
        params: { tripID: tripId },
      });
    }
  }, [tripId, pitchId]);

  return (
    <ActivityFeedItem isUnread={isUnread} onMarkRead={onMarkRead}>
      {isError ? (
        <Box
          backgroundColor="white"
          borderRadius="xl"
          overflow="hidden"
          style={styles.cardShadow}
        >
          <ErrorState
            title="Couldn't load pitch"
            description="Give it a moment and try again."
            refresh={refetch}
          />
        </Box>
      ) : isLoading || !pitch ? (
        <Box
          backgroundColor="white"
          borderRadius="xl"
          padding="md"
          alignItems="center"
          style={styles.cardShadow}
        >
          <ActivityIndicator size="small" color={ColorPalette.gray400} />
        </Box>
      ) : (
        <ActivityPitchCard
          pitch={pitch}
          timestamp={event.timestamp ?? ""}
          isUnread={isUnread}
          onMarkRead={onMarkRead}
          onViewPitch={handleViewPitch}
        />
      )}
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
});
