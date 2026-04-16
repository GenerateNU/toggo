import type { ModelsActivityAPIResponse } from "@/types/types.gen";

/**
 * Resolves the best available thumbnail URL for an activity.
 *
 * Fallback order:
 *  1. `thumbnail_url` (manually provided)
 *  2. `media_url` (manually provided)
 *  3. First uploaded image from `image_ids`
 */
export function getActivityThumbnailUrl(
  activity: ModelsActivityAPIResponse | undefined | null,
): string | undefined {
  return (
    activity?.thumbnail_url ??
    activity?.media_url ??
    activity?.image_ids?.[0]?.image_url ??
    undefined
  );
}

function activityUserIdsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const norm = (s: string) => s.replace(/-/g, "").toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Best URL for the proposer’s profile photo. The API usually sets `proposer_picture_url`,
 * but list payloads sometimes omit it while the same photo appears on `going_users` or
 * `comment_previews` (same user id).
 */
export function getActivityProposerProfilePictureUrl(
  activity: ModelsActivityAPIResponse | undefined | null,
): string | undefined {
  if (!activity) return undefined;

  const direct = activity.proposer_picture_url?.trim();
  if (direct) return direct;

  const proposerId = activity.proposed_by?.trim();
  if (!proposerId) return undefined;

  const fromGoing = activity.going_users
    ?.find((u) => u.user_id && activityUserIdsMatch(u.user_id, proposerId))
    ?.profile_picture_url?.trim();
  if (fromGoing) return fromGoing;

  const fromCommentPreview = activity.comment_previews
    ?.find((c) => c.user_id && activityUserIdsMatch(c.user_id, proposerId))
    ?.profile_picture_url?.trim();
  if (fromCommentPreview) return fromCommentPreview;

  return undefined;
}

const HTTP_MEDIA_URL = /^https?:\/\//i;

/**
 * `media_url` when it is an http(s) link (e.g. mood-board link items). Used to open in the browser from the activity screen.
 */
export function getActivityExternalMediaLinkUrl(
  activity: ModelsActivityAPIResponse | undefined | null,
): string | undefined {
  const url = activity?.media_url?.trim();
  if (!url || !HTTP_MEDIA_URL.test(url)) return undefined;
  return url;
}
