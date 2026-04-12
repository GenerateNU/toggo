import { Layout } from "@/design-system/tokens/layout";

// ─── Time Sections ───────────────────────────────────────────────────────────

export const TIME_SECTIONS = [
  { key: "unscheduled", title: "Unscheduled" },
  { key: "morning", title: "Morning" },
  { key: "afternoon", title: "Afternoon" },
  { key: "evening", title: "Evening" },
] as const;

export const TIME_SECTION_LABELS: Record<string, string> = {
  unscheduled: "Unscheduled",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

// ─── Auto-Scroll ─────────────────────────────────────────────────────────────

export const AUTO_SCROLL_EDGE = 50;
export const AUTO_SCROLL_SPEED = 5;
export const VERTICAL_AUTO_SCROLL_SPEED = 8;

// ─── Date Selector ───────────────────────────────────────────────────────────

export const CHIP_SIZE = 68;
export const CHIP_TOTAL_WIDTH = CHIP_SIZE + Layout.spacing.xs;

// ─── Activity Card ───────────────────────────────────────────────────────────

export const THUMBNAIL_SIZE = 68;
export const LONG_PRESS_DURATION_MS = 250;
