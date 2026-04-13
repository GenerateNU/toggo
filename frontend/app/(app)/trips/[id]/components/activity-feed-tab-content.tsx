import {
  getTripActivityFeedQueryKey,
  useGetTripActivityFeed,
} from "@/api/activity-feed/useGetTripActivityFeed";
import { getUnreadActivityCountQueryKey } from "@/api/activity-feed/useGetUnreadActivityCount";
import { useMarkActivityEventRead } from "@/api/activity-feed/useMarkActivityEventRead";
import { useGetPitch } from "@/api/pitches/useGetPitch";
import { useGetPoll } from "@/api/polls/useGetPoll";
import { getPollsByTripIDQueryKey } from "@/api/polls/useGetPollsByTripID";
import VotePollCard from "@/app/(app)/trips/[id]/polls/components/vote-poll-card";
import { Box, Text, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { RealtimeEvent } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import ActivityCard from "./activity-card";
import ActivityCardHeader from "./activity-card-header";
import ActivityCommentCard from "./activity-comment-card";
import ActivityFeedItem from "./activity-feed-item";
import ActivityPitchCard from "./activity-pitch-card";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityFeedTabContentProps = {
  tripId: string;
};

type ActivityType = "poll" | "activity" | "pitch" | "comment" | "unknown";

// ─── Constants ───────────────────────────────────────────────────────────────

const FEEDWORTHY_TOPICS: Record<string, ActivityType> = {
  "poll.created": "poll",
  "poll.vote_added": "poll",
  "activity.created": "activity",
  "pitch.created": "pitch",
  "comment.created": "comment",
};

const UNREAD_CUTOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveActivityType(topic?: string): ActivityType {
  if (!topic) return "unknown";
  return FEEDWORTHY_TOPICS[topic] ?? "unknown";
}

function isRecentEvent(timestamp?: string): boolean {
  if (!timestamp) return true;
  const eventTime = new Date(timestamp).getTime();
  return Date.now() - eventTime < UNREAD_CUTOFF_MS;
}

// ─── Poll Item ──────────────────────────────────────────────────────────────

function ActivityPollItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: {
  event: RealtimeEvent;
  tripId: string;
  isUnread: boolean;
  onMarkRead?: () => void;
}) {
  const pollId = event.entity_id ?? "";
  const { data: poll } = useGetPoll(tripId, pollId, {
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
          {poll ? (
            <VotePollCard
              poll={poll}
              tripId={tripId}
              onVoted={onMarkRead}
              onPress={handleViewPoll}
            />
          ) : (
            <Box padding="md" alignItems="center">
              <ActivityIndicator size="small" color={ColorPalette.gray400} />
            </Box>
          )}
        </Box>
      </Box>
    </ActivityFeedItem>
  );
}

// ─── Pitch Item ─────────────────────────────────────────────────────────────

function ActivityPitchItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: {
  event: RealtimeEvent;
  tripId: string;
  isUnread: boolean;
  onMarkRead?: () => void;
}) {
  const pitchId = event.entity_id ?? "";
  const { data: pitch } = useGetPitch(tripId, pitchId, {
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
      {pitch ? (
        <ActivityPitchCard
          pitch={pitch}
          timestamp={event.timestamp ?? ""}
          isUnread={isUnread}
          onMarkRead={onMarkRead}
          onViewPitch={handleViewPitch}
        />
      ) : (
        <Box
          backgroundColor="white"
          borderRadius="xl"
          padding="md"
          alignItems="center"
          style={styles.cardShadow}
        >
          <ActivityIndicator size="small" color={ColorPalette.gray400} />
        </Box>
      )}
    </ActivityFeedItem>
  );
}

// ─── Activity Item ──────────────────────────────────────────────────────────

function ActivityCardItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: {
  event: RealtimeEvent;
  tripId: string;
  isUnread: boolean;
  onMarkRead?: () => void;
}) {
  const data = event.data as Record<string, any> | undefined;
  const name = data?.name ?? "New activity";
  const activityId = event.entity_id ?? data?.id;

  const handleView = useCallback(() => {
    if (activityId) {
      router.push({
        pathname: `/trips/${tripId}/activities/${activityId}` as any,
        params: { tripID: tripId },
      });
    }
  }, [tripId, activityId]);

  return (
    <ActivityFeedItem isUnread={isUnread} onMarkRead={onMarkRead}>
      <ActivityCard
        name={name}
        actorId={event.actor_id}
        timestamp={event.timestamp ?? ""}
        isUnread={isUnread}
        onMarkRead={onMarkRead}
        onView={handleView}
      />
    </ActivityFeedItem>
  );
}

// ─── Comment Item ───────────────────────────────────────────────────────────

function ActivityCommentItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: {
  event: RealtimeEvent;
  tripId: string;
  isUnread: boolean;
  onMarkRead?: () => void;
}) {
  const data = event.data as Record<string, any> | undefined;
  const entityType = data?.entity_type as string | undefined;
  const entityId = (data?.entity_id ?? event.entity_id) as string | undefined;

  const commentData = useMemo(
    () => ({
      id: event.entity_id,
      body: data?.body ?? data?.content,
      user_id: event.actor_id,
      user_name: event.actor_name,
      entity_type: entityType,
      entity_name: data?.entity_name,
    }),
    [event.entity_id, data, event.actor_id, event.actor_name, entityType],
  );

  const handleViewComment = useCallback(() => {
    if (!entityId) return;
    const pathname =
      entityType === "pitch"
        ? `/trips/${tripId}/pitches/${entityId}`
        : `/trips/${tripId}/activities/${entityId}`;
    router.push({
      pathname: pathname as any,
      params: { tripID: tripId, openComments: "true" },
    });
  }, [tripId, entityId, entityType]);

  return (
    <ActivityFeedItem isUnread={isUnread} onMarkRead={onMarkRead}>
      <ActivityCommentCard
        comment={commentData}
        timestamp={event.timestamp ?? ""}
        isUnread={isUnread}
        onMarkRead={onMarkRead}
        onViewComment={handleViewComment}
      />
    </ActivityFeedItem>
  );
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

  // Real-time: refetch feed on new events
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

  // Split events into recent (unread) and earlier
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

  const renderEvent = (event: RealtimeEvent, isUnread: boolean) => {
    const type = resolveActivityType(event.topic);
    const eventId = event.id ?? "";
    const onMarkRead = isUnread ? () => handleMarkRead(eventId) : undefined;

    switch (type) {
      case "poll":
        return (
          <ActivityPollItem
            key={eventId}
            event={event}
            tripId={tripId}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
          />
        );
      case "activity":
        return (
          <ActivityCardItem
            key={eventId}
            event={event}
            tripId={tripId}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
          />
        );
      case "pitch":
        return (
          <ActivityPitchItem
            key={eventId}
            event={event}
            tripId={tripId}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
          />
        );
      case "comment":
        return (
          <ActivityCommentItem
            key={eventId}
            event={event}
            tripId={tripId}
            isUnread={isUnread}
            onMarkRead={onMarkRead}
          />
        );
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
          {recentEvents.map((event) => renderEvent(event, true))}
        </Box>
      )}

      {earlierEvents.length > 0 && recentEvents.length > 0 && (
        <EarlierDivider />
      )}

      {earlierEvents.length > 0 && (
        <Box style={styles.eventList}>
          {earlierEvents.map((event) => renderEvent(event, false))}
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
  cardShadow: {
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: Layout.spacing.xs,
    elevation: 3,
  },
  pollCardInner: {
    padding: Layout.spacing.sm - Layout.spacing.xxs, // 12
    gap: Layout.spacing.sm - Layout.spacing.xxs, // 12
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
