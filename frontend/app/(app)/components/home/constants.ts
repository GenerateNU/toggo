/** First page of trips on the home screen; matches API default max page size intent. */
export const HOME_TRIPS_PAGE_SIZE = 20;

export const HOME_UPCOMING_IMAGE_HEIGHT = 140;
export const HOME_PAST_TRIP_IMAGE_SIZE = 72;
export const HOME_RECOMMENDED_CARD_WIDTH = 250;

export const HOME_CARD_FLOATING_SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

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

export type RecommendedTripDestination = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

export const RECOMMENDED_DESTINATIONS: RecommendedTripDestination[] = [
  {
    id: "ldn",
    title: "London",
    description:
      "Vibrant, historic, and cosmopolitan capital blending centuries-old tradition with modern innovation.",
    imageUrl:
      "https://www.figma.com/api/mcp/asset/134bec24-3629-41ee-bb00-acf957538daf",
  },
  {
    id: "puerto-rico",
    title: "Puerto Rico",
    description:
      "Tropical island paradise with turquoise waters, colorful colonial towns, and white-sand beaches.",
    imageUrl:
      "https://www.figma.com/api/mcp/asset/79b431a6-3b0d-4293-9bc6-8e4f5d2c48c7",
  },
];
