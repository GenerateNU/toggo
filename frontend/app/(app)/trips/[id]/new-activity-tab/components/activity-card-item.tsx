import { router } from "expo-router";
import { useCallback } from "react";
import ActivityCard from "./activity-card";
import ActivityFeedItem from "./activity-feed-item";
import type { ActivityItemProps } from "../types";

export default function ActivityCardItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: ActivityItemProps) {
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
