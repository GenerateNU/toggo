import { Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Shadow } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import { Image } from "expo-image";
import { MapPin, MessageCircle } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { MapSize, MapSpacing } from "../tokens";
import {
  formatCategoryLabel,
  isHousingOrTransportType,
  type TripMapActivity,
} from "../types";
import { getActivityCategoryIcon } from "./map-pin";
import { PfpCountBubble } from "./pfp-count-bubble";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max avatars shown before the +X count bubble takes over. */
const MAX_VISIBLE_AVATARS = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

type MapLocationCardProps = {
  activity: TripMapActivity;
  onPress?: () => void;
};

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

        {/* Content column */}
        <View style={styles.contentColumn}>
          {/* Info block */}
          <View style={styles.infoBlock}>
            <Text variant="bodyXsStrong" color="gray500" numberOfLines={1}>
              {categoryLabel}
            </Text>

            {/* Title + subtitle */}
            <View style={styles.titleGroup}>
              <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
                {activity.name}
              </Text>

              {isHousingTransport ? (
                activity.estimated_price != null ? (
                  // Style A: price
                  <View style={styles.priceRow}>
                    <Text variant="bodySmStrong" color="gray500">
                      ${activity.estimated_price}
                    </Text>
                    <Text variant="bodySmDefault" color="gray500">
                      per person
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
              ) : activity.location_name ? (
                // Style B: location with pin icon
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
              ) : null}
            </View>
          </View>

          {/* Engagement row */}
          <View style={styles.engagementRow}>
            {isHousingTransport ? (
              // ── Style A: flex-1 comment pill with commenter avatars ────────
              <View style={styles.commentPillFlex}>
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
                    <View style={{ marginLeft: -Layout.spacing.xxs }}>
                      <PfpCountBubble
                        variant="xs"
                        count={commentCount - MAX_VISIBLE_AVATARS}
                      />
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
              // ── Style B: compact comment icon pill + going section ─────────
              <>
                <View style={styles.commentPillCompact}>
                  <MessageCircle
                    size={CoreSize.xs}
                    color={ColorPalette.gray950}
                  />
                  <Text variant="bodyMedium" color="gray950">
                    {commentCount}
                  </Text>
                </View>

                {goingCount > 0 && (
                  <View style={styles.goingSection}>
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
                          style={{ marginLeft: MapSpacing.avatarOverlapSm }}
                        >
                          <PfpCountBubble
                            variant="sm"
                            count={goingCount - MAX_VISIBLE_AVATARS}
                          />
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
  // Figma: flex-col gap-[4px] (category ↔ title group)
  infoBlock: {
    gap: Layout.spacing.xxs,
  },
  // Figma: flex-col gap-[2px] (title ↔ subtitle)
  titleGroup: {
    gap: MapSpacing.titleSubtitleGap,
  },
  // Figma: flex gap-[3px] (price amount ↔ unit)
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.priceRowGap,
  },
  // Figma: gap-[4px] (pin icon ↔ location text)
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
  // Figma: h-[24px], 16px avatars mr-[-4px]
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
  // Figma: h-[24px], 24px avatars mr-[-6px]
  goingAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    height: CoreSize.sm,
  },
});
