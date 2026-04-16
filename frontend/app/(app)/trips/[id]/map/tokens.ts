/**
 * Map feature tokens — component-level spacing and size values derived from the
 * Figma design that supplement the global design system tokens.
 *
 * These live here rather than in the global token files because they are specific
 * to the map UI and don't represent universally applicable design decisions.
 */

export const MapSpacing = {
  /** Gap between the card image slot and the text content column — Figma: gap-[12px] */
  cardInnerGap: 12,
  /** Gap between sections in the list bottom sheet — Figma: gap-[15px] */
  contentSectionGap: 15,
  /** Gap between sections in the detail bottom sheet — Figma: gap-[10px] */
  detailSectionGap: 10,
  /** Gap between the drag handle bar and the sheet body — Figma: gap-[12px] */
  handleContentGap: 12,
  /** Horizontal padding inside a filter tab pill — Figma: px-[12px] */
  tabPaddingH: 12,
  /** Inner gap used for avatar-to-label spacing and compact pill interiors — Figma: gap-[6px] */
  innerGap: 6,
  /** Negative margin that overlaps stacked sm (24 px) avatars — Figma: mr-[-6px] */
  avatarOverlapSm: -6,
  /** Gap between the price amount and its unit label — Figma: gap-[3px] */
  priceRowGap: 3,
  /** Gap between the activity title line and its subtitle line — Figma: gap-[2px] */
  titleSubtitleGap: 2,
} as const;

export const MapSize = {
  /** Square thumbnail image size in location list cards — Figma: 96×96 */
  cardImageThumbnail: 96,
  /** Hero image height in the location detail sheet — Figma: h-[194px] */
  detailImageHeight: 194,
  /**
   * Corner radius for thumbnail images — Figma: rounded-[11.325px].
   * Rounded to the nearest integer; sits between CornerRadius.sm (8) and CornerRadius.md (12).
   */
  imageThumbnailRadius: 11,
} as const;
