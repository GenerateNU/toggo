/** First page of trips on the home screen; matches API default max page size intent. */
export const HOME_TRIPS_PAGE_SIZE = 20;

export const HOME_UPCOMING_IMAGE_HEIGHT = 170;
export const HOME_PAST_TRIP_IMAGE_SIZE = 72;
export const HOME_RECOMMENDED_CARD_WIDTH = 250;

export const HOME_HEADER_BUTTON_SIZE = 36;

export const MAX_VISIBLE_MEMBERS = 3;

export const NULL_DATE_DISPLAY_OPTIONS = {
  hide: "hide",
  placeholder: "placeholder",
  partialOnly: "partialOnly",
} as const;

export type NullDateDisplayOption =
  (typeof NULL_DATE_DISPLAY_OPTIONS)[keyof typeof NULL_DATE_DISPLAY_OPTIONS];

/** Product default for missing trip dates. */
export const HOME_NULL_DATE_DISPLAY: NullDateDisplayOption =
  NULL_DATE_DISPLAY_OPTIONS.placeholder;

export type RecommendedActivity = {
  id: string;
  name: string;
  thumbnail_url: string;
  estimated_price: number;
  description: string;
};

export type RecommendedTripDestination = {
  id: string;
  title: string;
  country: string;
  description: string;
  imageUrl: string;
  locationLat: number;
  locationLng: number;
  activities: RecommendedActivity[];
};

export { default as RECOMMENDED_DESTINATIONS } from "./recommended_destinations.json";

export default function HomeConstantsRoute() {
  return null;
}
