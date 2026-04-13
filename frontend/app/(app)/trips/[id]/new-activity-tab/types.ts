import type { ModelsPitchAPIResponse, RealtimeEvent } from "@/types/types.gen";

// ─── Activity Types ─────────────────────────────────────────────────────────

export type ActivityType =
  | "poll"
  | "activity"
  | "pitch"
  | "comment"
  | "unknown";

// ─── Feed Props ─────────────────────────────────────────────────────────────

export type ActivityFeedTabContentProps = {
  tripId: string;
};

export type ActivityFeedItemProps = {
  isUnread: boolean;
  onMarkRead?: () => void;
  children: React.ReactNode;
};

export type ActivityItemProps = {
  event: RealtimeEvent;
  tripId: string;
  isUnread: boolean;
  onMarkRead?: () => void;
};

// ─── Card Header ────────────────────────────────────────────────────────────

export type ActivityCardHeaderProps = {
  activityType: ActivityType;
  timestamp: string;
  isUnread?: boolean;
  onMarkRead?: () => void;
  goToLabel?: string;
  onGoTo?: () => void;
};

// ─── Context Menu ───────────────────────────────────────────────────────────

export type MenuPosition = { top: number; right: number };

export type ActivityContextMenuProps = {
  visible: boolean;
  goToLabel: string;
  anchorPosition: MenuPosition | null;
  onClose: () => void;
  onMarkRead?: () => void;
  onGoTo?: () => void;
};

// ─── Card Props ─────────────────────────────────────────────────────────────

export type ActivityCardProps = {
  name: string;
  actorId?: string;
  timestamp: string;
  isUnread: boolean;
  onMarkRead?: () => void;
  onView?: () => void;
};

export type CommentData = {
  id?: string;
  body?: string;
  user_id?: string;
  user_name?: string;
  entity_type?: string;
  entity_name?: string;
};

export type ActivityCommentCardProps = {
  comment: CommentData;
  timestamp: string;
  isUnread: boolean;
  onMarkRead?: () => void;
  onViewComment?: () => void;
};

export type ActivityPitchCardProps = {
  pitch: ModelsPitchAPIResponse;
  timestamp: string;
  isUnread: boolean;
  onMarkRead?: () => void;
  onViewPitch?: () => void;
};
