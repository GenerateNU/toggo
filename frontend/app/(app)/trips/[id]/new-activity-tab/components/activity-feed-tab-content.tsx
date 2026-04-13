import {
  getTripActivityFeedQueryKey,
  useGetTripActivityFeed,
} from "@/api/activity-feed/useGetTripActivityFeed";
import { getUnreadActivityCountQueryKey } from "@/api/activity-feed/useGetUnreadActivityCount";
import { useMarkActivityEventRead } from "@/api/activity-feed/useMarkActivityEventRead";
import { getPollsByTripIDQueryKey } from "@/api/polls/useGetPollsByTripID";
import { Box, Text, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { RealtimeEvent } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import ActivityCardItem from "./activity-card-item";
import ActivityCommentItem from "./activity-comment-item";
import { FEEDWORTHY_TOPICS, RECENT_CUTOFF_MS } from "../constants";
import type {
  ActivityFeedTabContentProps,
  ActivityType,
} from "../types";
import ActivityPitchItem from "./activity-pitch-item";
import ActivityPollItem from "./activity-poll-item";

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveActivityType(topic?: string): ActivityType {
  if (!topic) return "unknown";
  return FEEDWORTHY_TOPICS[topic] ?? "unknown";
}

function isRecentEvent(timestamp?: string): boolean {
  if (!timestamp) return true;
  const eventTime = new Date(timestamp).getTime();
  return Date.now() - eventTime < RECENT_CUTOFF_MS;
}

// ─── Section Divider ────────────────────────────────────────────────────────

function EarlierDivider() {
  return (
    <Box flexDirection="row" alignItems="center" gap="xs">
      <View style={styles.dividerLine} />
      <Text variant="bodyXsMedium" color="gray500">
        Earlier
      </Text>
      <View style={styles.dividerLine} />
    </Box>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ActivityFeedTabContent({
  tripId,
}: ActivityFeedTabContentProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: events, isLoading, isError } = useGetTripActivityFeed(tripId);

  const markRead = useMarkActivityEventRead();

  const handleRealtimeEvent = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getTripActivityFeedQueryKey(tripId),
    });
    queryClient.invalidateQueries({
      queryKey: getUnreadActivityCountQueryKey(tripId),
    });
    queryClient.invalidateQueries({
      queryKey: getPollsByTripIDQueryKey(tripId),
    });
  }, [queryClient, tripId]);

  useTripRealtime(tripId, handleRealtimeEvent);

  // Split events into recent and earlier for visual grouping only.
  // All events from the feed API are unread — the grouping is presentational.
  const { recentEvents, earlierEvents } = useMemo(() => {
    if (!events) return { recentEvents: [], earlierEvents: [] };

    const recent: RealtimeEvent[] = [];
    const earlier: RealtimeEvent[] = [];

    for (const event of events) {
      if (isRecentEvent(event.timestamp)) {
        recent.push(event);
      } else {
        earlier.push(event);
      }
    }

    return { recentEvents: recent, earlierEvents: earlier };
  }, [events]);

  const handleMarkRead = useCallback(
    async (eventId: string) => {
      queryClient.setQueryData<RealtimeEvent[]>(
        getTripActivityFeedQueryKey(tripId),
        (old) => old?.filter((e) => e.id !== eventId),
      );
      try {
        await markRead.mutateAsync({ tripID: tripId, eventID: eventId });
        queryClient.invalidateQueries({
          queryKey: getUnreadActivityCountQueryKey(tripId),
        });
      } catch {
        queryClient.invalidateQueries({
          queryKey: getTripActivityFeedQueryKey(tripId),
        });
        toast.show({ message: "Couldn't mark as read. Try again." });
      }
    },
    [markRead, tripId, queryClient, toast],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!events) return;
    queryClient.setQueryData<RealtimeEvent[]>(
      getTripActivityFeedQueryKey(tripId),
      () => [],
    );
    try {
      await Promise.all(
        events.map((e) =>
          e.id ? markRead.mutateAsync({ tripID: tripId, eventID: e.id }) : null,
        ),
      );
      queryClient.invalidateQueries({
        queryKey: getUnreadActivityCountQueryKey(tripId),
      });
    } catch {
      queryClient.invalidateQueries({
        queryKey: getTripActivityFeedQueryKey(tripId),
      });
      toast.show({ message: "Couldn't mark all as read. Try again." });
    }
  }, [events, markRead, tripId, queryClient, toast]);

  // ─── Render Helpers ──────────────────────────────────────────────────────

  const renderEvent = (event: RealtimeEvent) => {
    const type = resolveActivityType(event.topic);
    const eventId = event.id ?? "";
    const onMarkRead = () => handleMarkRead(eventId);

    const props = { event, tripId, isUnread: true, onMarkRead };

    switch (type) {
      case "poll":
        return <ActivityPollItem key={eventId} {...props} />;
      case "activity":
        return <ActivityCardItem key={eventId} {...props} />;
      case "pitch":
        return <ActivityPitchItem key={eventId} {...props} />;
      case "comment":
        return <ActivityCommentItem key={eventId} {...props} />;
      default:
        return null;
    }
  };

  // ─── Loading / Error / Empty States ───────────────────────────────────

  if (isLoading) {
    return (
      <Box padding="lg" alignItems="center">
        <ActivityIndicator size="small" color={ColorPalette.gray400} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box padding="lg" alignItems="center">
        <Text variant="bodySmDefault" color="gray500">
          Couldn't load activity feed.
        </Text>
      </Box>
    );
  }

  const hasEvents = (events?.length ?? 0) > 0;

  if (!hasEvents) {
    return (
      <Box padding="lg" alignItems="center" gap="xs">
        <Text variant="bodyMedium" color="gray500">
          No new activity
        </Text>
        <Text variant="bodySmDefault" color="gray400">
          Activity from your trip will show up here.
        </Text>
      </Box>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────

  return (
    <Box style={styles.feed}>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="bodySmDefault" color="gray500">
          Recent Activity
        </Text>
        <Pressable onPress={handleMarkAllRead}>
          <Text variant="bodySmMedium" style={styles.markAllText}>
            Mark as all read
          </Text>
        </Pressable>
      </Box>

      {recentEvents.length > 0 && (
        <Box style={styles.eventList}>
          {recentEvents.map((event) => renderEvent(event))}
        </Box>
      )}

      {earlierEvents.length > 0 && recentEvents.length > 0 && (
        <EarlierDivider />
      )}

      {earlierEvents.length > 0 && (
        <Box style={styles.eventList}>
          {earlierEvents.map((event) => renderEvent(event))}
        </Box>
      )}
    </Box>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  feed: {
    gap: Layout.spacing.sm,
  },
  eventList: {
    gap: Layout.spacing.sm,
  },
  markAllText: {
    color: ColorPalette.blue500,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: ColorPalette.gray300,
  },
});
