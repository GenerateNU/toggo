import { Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Shadow } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily } from "@/design-system/tokens/typography";
import { Image } from "expo-image";
import { MapPin, MessageCircle } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { MapSize, MapSpacing } from "../tokens";
import { formatCategoryLabel, type TripMapActivity } from "../types";
import { getActivityCategoryIcon } from "./map-pin";

// ─── Constants ────────────────────────────────────────────────────────────────

// Show 2 avatars then a "+X" count bubble for the rest
const MAX_VISIBLE_AVATARS = 2;

/** Categories that use the housing/transport card style (Style A). */
const HOUSING_TRANSPORT_CATEGORIES = new Set([
  "housing",
  "accommodation",
  "hotel",
  "lodging",
  "transportation",
  "transport",
  "transit",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

type MapLocationCardProps = {
  activity: TripMapActivity;
  onPress?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isHousingOrTransportType(categoryNames?: string[]): boolean {
  return (
    categoryNames?.some((name) =>
      HOUSING_TRANSPORT_CATEGORIES.has(name.toLowerCase().trim()),
    ) ?? false
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapLocationCard({ activity, onPress }: MapLocationCardProps) {
  const imageUri = activity.thumbnail_url ?? activity.media_url;
  const CategoryIcon = getActivityCategoryIcon(activity.category_names);
  const categoryLabel = formatCategoryLabel(
    activity.category_names?.[0] ?? "activity",
  );
  const commentPreviews = activity.comment_previews ?? [];
  const goingUsers = activity.going_users ?? [];
  const goingCount = activity.going_count ?? 0;
  const commentCount = activity.comment_count ?? 0;

  const isHousingTransport = isHousingOrTransportType(activity.category_names);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Figma: flex gap-[12px] items-center */}
      <View style={styles.cardInner}>

        {/* Thumbnail */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imageFallback}>
              <CategoryIcon size={CoreSize.sm} color={ColorPalette.gray400} />
            </View>
          )}
        </View>

        {/* Content column — Figma: flex-col gap-[6px] */}
        <View style={styles.contentColumn}>

          {/* Info block — Figma: flex-col gap-[4px] */}
          <View style={styles.infoBlock}>
            <Text variant="bodyXsStrong" color="gray500" numberOfLines={1}>
              {categoryLabel}
            </Text>

            {/* Title + subtitle — Figma: flex-col gap-[2px] */}
            <View style={styles.titleGroup}>
              <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
                {activity.name}
              </Text>

              {isHousingTransport ? (
                // Style A subtitle: price — Figma: flex gap-[3px]
                activity.estimated_price != null ? (
                  <View style={styles.priceRow}>
                    <Text variant="bodySmStrong" color="gray500">
                      ${activity.estimated_price}
                    </Text>
                    <Text variant="bodySmDefault" color="gray500">
                      {"per person"}
                    </Text>
                  </View>
                ) : activity.location_name ? (
                  <Text
                    variant="bodySmDefault"
                    color="gray500"
                    numberOfLines={1}
                  >
                    {activity.location_name}
                  </Text>
                ) : null
              ) : (
                // Style B subtitle: location with icon — Figma: gap-[4px]
                activity.location_name ? (
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={ColorPalette.gray500} />
                    <Text
                      variant="bodySmDefault"
                      color="gray500"
                      numberOfLines={1}
                      style={styles.locationText}
                    >
                      {activity.location_name}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          </View>

          {/* Engagement row — Figma: flex gap-[8px] items-center */}
          <View style={styles.engagementRow}>
            {isHousingTransport ? (
              // ── Style A: ViewCommentsButton flex-1 ───────────────────────
              // Figma: flex-1 bg-gray-25 px-[6px] py-[4px] rounded-[8px] gap-[6px]
              // Inner: PFP Row h-[24px] pr-[4px], 16px avatars mr-[-4px] + count text
              <View style={styles.commentPillFlex}>
                {/* PFP Row — comment_previews, 16px avatars, mr-[-4px] overlap, +X bubble */}
                <View style={styles.pfpRow}>
                  {commentPreviews
                    .slice(0, MAX_VISIBLE_AVATARS)
                    .map((user, index) => (
                      <View
                        key={user.user_id ?? index}
                        style={[
                          index > 0 && { marginLeft: -Layout.spacing.xxs },
                          { zIndex: MAX_VISIBLE_AVATARS - index },
                        ]}
                      >
                        <Avatar
                          variant="xs"
                          seed={user.user_id ?? String(index)}
                          profilePhoto={user.profile_picture_url ?? undefined}
                        />
                      </View>
                    ))}
                  {commentCount > MAX_VISIBLE_AVATARS && (
                    <View
                      style={[
                        styles.countBubbleSm,
                        { marginLeft: -Layout.spacing.xxs, zIndex: 0 },
                      ]}
                    >
                      <Text style={styles.countBubbleSmText}>
                        +{commentCount - MAX_VISIBLE_AVATARS}
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="bodySmStrong" color="gray950" numberOfLines={1}>
                  {commentCount > 0
                    ? `${commentCount} comments`
                    : "No comments"}
                </Text>
              </View>
            ) : (
              // ── Style B: compact comment pill + going section ─────────────
              <>
                {/* Figma: shrink-0 bg-gray-25 px-[8px] py-[4px] rounded-[8px] gap-[4px] */}
                <View style={styles.commentPillCompact}>
                  <MessageCircle
                    size={CoreSize.xs}
                    color={ColorPalette.gray950}
                  />
                  <Text variant="bodyMedium" color="gray950">
                    {commentCount}
                  </Text>
                </View>

                {/* Figma: self-stretch, inner gap-[6px] h-full items-center */}
                {goingCount > 0 && (
                  <View style={styles.goingSection}>
                    {/* Figma: h-[24px] isolate, 24px avatars mr-[-6px] overlap, +X bubble */}
                    <View style={styles.goingAvatarRow}>
                      {goingUsers
                        .slice(0, MAX_VISIBLE_AVATARS)
                        .map((user, index) => (
                          <View
                            key={user.user_id ?? index}
                            style={[
                              index > 0 && {
                                marginLeft: MapSpacing.avatarOverlapSm,
                              },
                              { zIndex: MAX_VISIBLE_AVATARS - index },
                            ]}
                          >
                            <Avatar
                              variant="sm"
                              seed={user.user_id ?? String(index)}
                              profilePhoto={
                                user.profile_picture_url ?? undefined
                              }
                            />
                          </View>
                        ))}
                      {goingCount > MAX_VISIBLE_AVATARS && (
                        <View
                          style={[
                            styles.countBubbleMd,
                            {
                              marginLeft: MapSpacing.avatarOverlapSm,
                              zIndex: 0,
                            },
                          ]}
                        >
                          <Text style={styles.countBubbleMdText}>
                            +{goingCount - MAX_VISIBLE_AVATARS}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="bodyMedium" color="gray950">
                      {goingCount} going
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Figma: bg-white p-[8px] rounded-[16px] shadow-[0px_0px_20px_-5px_rgba(0,0,0,0.25)]
  card: {
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.lg,
    padding: Layout.spacing.xs,
    ...Shadow.xl,
  },
  cardPressed: {
    opacity: 0.95,
  },
  // Figma: flex gap-[12px] items-center
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.cardInnerGap,
  },
  imageContainer: {
    width: MapSize.cardImageThumbnail,
    height: MapSize.cardImageThumbnail,
    borderRadius: MapSize.imageThumbnailRadius,
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: ColorPalette.gray50,
  },
  image: {
    width: MapSize.cardImageThumbnail,
    height: MapSize.cardImageThumbnail,
  },
  imageFallback: {
    width: MapSize.cardImageThumbnail,
    height: MapSize.cardImageThumbnail,
    alignItems: "center",
    justifyContent: "center",
  },
  // Figma: flex-col gap-[6px]
  contentColumn: {
    flex: 1,
    gap: MapSpacing.innerGap,
    minWidth: 0,
  },
  // Figma: flex-col gap-[4px]
  infoBlock: {
    gap: Layout.spacing.xxs,
  },
  // Figma: flex-col gap-[2px]
  titleGroup: {
    gap: MapSpacing.titleSubtitleGap,
  },
  // Figma: flex gap-[3px] (price amount ↔ unit label)
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.priceRowGap,
  },
  // Figma: gap-[4px] (map-pin icon ↔ location text)
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
  },
  locationText: {
    flex: 1,
  },
  // Figma: flex gap-[8px] items-center
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },

  // ── Style A (housing/transport) ───────────────────────────────────────────

  // Figma: flex-1 bg-gray-25 px-[6px] py-[4px] rounded-[8px] gap-[6px]
  commentPillFlex: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.innerGap,
    backgroundColor: ColorPalette.gray25,
    borderRadius: CornerRadius.sm,
    paddingHorizontal: MapSpacing.innerGap,
    paddingVertical: Layout.spacing.xxs,
    minWidth: 0,
  },
  // Figma: h-[24px] pr-[4px], 16px avatars mr-[-4px]
  pfpRow: {
    flexDirection: "row",
    alignItems: "center",
    height: CoreSize.sm,
  },

  // ── Style B (activities / default) ───────────────────────────────────────

  // Figma: shrink-0 bg-gray-25 px-[8px] py-[4px] rounded-[8px] gap-[4px]
  commentPillCompact: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
    backgroundColor: ColorPalette.gray25,
    borderRadius: CornerRadius.sm,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xxs,
  },
  // Figma: self-stretch, inner gap-[6px] h-full items-center
  goingSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.innerGap,
    alignSelf: "stretch",
  },
  // Figma: h-[24px] isolate items-center, 24px avatars mr-[-6px]
  goingAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    height: CoreSize.sm,
  },

  // ── Count bubbles ─────────────────────────────────────────────────────────

  // Figma: 16×16 white circle, shadow 0 0 2.667 rgba(0,0,0,0.25)
  // Overlaps previous avatar via marginLeft: -Layout.spacing.xxs
  countBubbleSm: {
    width: CoreSize.xs,
    height: CoreSize.xs,
    borderRadius: CornerRadius.full,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 2.667,
    elevation: 2,
  },
  // Figma: text "+X" — Figtree Medium 6.67px #6e6e6e
  countBubbleSmText: {
    fontFamily: FontFamily.medium,
    fontSize: 7,
    color: ColorPalette.gray500,
    lineHeight: 8,
  },

  // Figma: 24×24 white circle, shadow 0 0 4 rgba(0,0,0,0.25)
  // Overlaps previous avatar via marginLeft: MapSpacing.avatarOverlapSm
  countBubbleMd: {
    width: CoreSize.sm,
    height: CoreSize.sm,
    borderRadius: CornerRadius.full,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  // Figma: text "+X" — Figtree Medium ~10px #6e6e6e
  countBubbleMdText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: ColorPalette.gray500,
    lineHeight: 12,
  },
});
