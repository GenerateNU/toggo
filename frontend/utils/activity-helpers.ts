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
