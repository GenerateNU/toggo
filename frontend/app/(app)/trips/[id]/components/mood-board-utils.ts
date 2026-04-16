import type { ModelsActivityAPIResponse } from "@/types/types.gen";

export type MoodBoardVariant = "text" | "image" | "link";

const HTTP_URL = /^https?:\/\//i;

/**
 * Maps a stored activity to a mood-board card variant.
 * Precedence: link (media_url) → image (thumbnail / gallery) → text note.
 */
export function getMoodBoardVariant(
  activity: ModelsActivityAPIResponse,
): MoodBoardVariant {
  const media = activity.media_url?.trim();
  if (media && HTTP_URL.test(media)) {
    return "link";
  }
  const hasImage =
    !!activity.thumbnail_url?.trim() ||
    (activity.image_ids?.length ?? 0) > 0;
  if (hasImage) {
    return "image";
  }
  return "text";
}

function trim(s: string | undefined): string {
  return (s ?? "").trim();
}

export type MoodBoardCreateMode = "text" | "image" | "link";

/** Validates XOR for mood-board activity payloads before create. */
export function assertMoodBoardActivityXor(
  mode: MoodBoardCreateMode,
  payload: {
    name: string;
    description?: string;
    thumbnail_url?: string;
    media_url?: string;
    image_ids?: string[];
  },
): void {
  const desc = trim(payload.description);
  const name = trim(payload.name);
  const thumb = trim(payload.thumbnail_url);
  const media = trim(payload.media_url);
  const ids = payload.image_ids?.filter(Boolean) ?? [];

  if (mode === "link") {
    if (!media || !HTTP_URL.test(media)) {
      throw new Error("Link mood item requires a valid http(s) media_url.");
    }
    if (ids.length > 0) {
      throw new Error("Link mood item cannot include uploaded image_ids.");
    }
    return;
  }

  if (mode === "text") {
    if (!desc) {
      throw new Error("Note requires description text.");
    }
    if (thumb || media || ids.length > 0) {
      throw new Error("Note cannot include images or links.");
    }
    if (!name) {
      throw new Error("Note requires a title.");
    }
    return;
  }

  // image (+ optional description)
  if (ids.length === 0 && !thumb) {
    throw new Error("Image mood item requires image_ids or thumbnail_url.");
  }
  if (media) {
    throw new Error("Image mood item cannot set media_url (use link mode).");
  }
}
