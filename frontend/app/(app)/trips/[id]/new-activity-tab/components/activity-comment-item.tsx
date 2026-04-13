import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import ActivityCommentCard from "./activity-comment-card";
import ActivityFeedItem from "./activity-feed-item";
import type { ActivityItemProps } from "../types";

export default function ActivityCommentItem({
  event,
  tripId,
  isUnread,
  onMarkRead,
}: ActivityItemProps) {
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
