import type { ModelsActivityAPIResponse } from "@/types/types.gen";

export type TripMapActivity = {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  location_name?: string;
  description?: string;
  thumbnail_url?: string;
  media_url?: string;
  estimated_price?: number;
  comment_count?: number;
  /** Avatars of recent commenters — used in the Style A (housing/transport) comment pill. */
  comment_previews?: Array<{
    user_id?: string;
    profile_picture_url?: string;
  }>;
  going_count?: number;
  going_users?: Array<{
    user_id?: string;
    profile_picture_url?: string | null;
  }>;
  category_names?: string[];
};

export type MapCategoryFilter = "all" | string;

/**
 * Converts a backend category slug to Title Case for display.
 * e.g. "activities" → "Activities", "day_trips" → "Day Trips"
 */
export function formatCategoryLabel(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toTripMapActivity(
  activity: ModelsActivityAPIResponse,
): TripMapActivity | null {
  const lat = activity.location_lat;
  const lng = activity.location_lng;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return {
    id: activity.id ?? "",
    name: activity.name?.trim() || "Activity",
    location_lat: lat,
    location_lng: lng,
    location_name: activity.location_name?.trim() || undefined,
    description: activity.description?.trim() || undefined,
    thumbnail_url: activity.thumbnail_url?.trim() || undefined,
    media_url: activity.media_url?.trim() || undefined,
    estimated_price: activity.estimated_price ?? undefined,
    comment_count: activity.comment_count ?? undefined,
    comment_previews: activity.comment_previews ?? undefined,
    going_count: activity.going_count ?? undefined,
    going_users: activity.going_users ?? undefined,
    category_names: activity.category_names ?? undefined,
  };
}
