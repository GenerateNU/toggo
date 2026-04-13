import type { ActivityType } from "../types";
import type { LucideIcon } from "lucide-react-native";
import {
  ChartColumnBig,
  Binoculars,
  MapPin,
  MessageCircle,
} from "lucide-react-native";

// ─── Feed Item (swipe-to-dismiss) ───────────────────────────────────────────

export const SWIPE_ICON_SIZE = 15;
export const DISMISS_THRESHOLD = -160;
export const SNAP_BACK_CONFIG = { duration: 250 };

// ─── Feed Topics ────────────────────────────────────────────────────────────

export const FEEDWORTHY_TOPICS: Record<string, ActivityType> = {
  "poll.created": "poll",
  "poll.vote_added": "poll",
  "activity.created": "activity",
  "pitch.created": "pitch",
  "comment.created": "comment",
};

// ─── Time Grouping ──────────────────────────────────────────────────────────

export const RECENT_CUTOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Card Header ────────────────────────────────────────────────────────────

export const CHIP_ICON_SIZE = 14;
export const MENU_ICON_SIZE = 16;

export const ACTIVITY_CONFIG: Record<
  ActivityType,
  { label: string; icon: LucideIcon }
> = {
  poll: { label: "New Poll", icon: ChartColumnBig },
  activity: { label: "New Activity", icon: Binoculars },
  pitch: { label: "New Pitch", icon: MapPin },
  comment: { label: "New Comment", icon: MessageCircle },
  unknown: { label: "Update", icon: ChartColumnBig },
};

// ─── Context Menu ───────────────────────────────────────────────────────────

export const CONTEXT_MENU_ICON_SIZE = 18;
export const CONTEXT_MENU_WIDTH = 214;
export const DIVIDER_COLOR = "rgba(41, 54, 68, 0.2)";
export const ROW_PRESSED_BG = "rgba(255, 255, 255, 0.35)";

// ─── Cards ──────────────────────────────────────────────────────────────────

export const CTA_ICON_SIZE = 16;
export const CONTEXT_ICON_SIZE = 14;
export const AVATAR_TEXT_GAP = 6;
export const TEXT_COLUMN_GAP = 2;
export const THUMBNAIL_HEIGHT = 166;
