import { Button, Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Layout } from "@/design-system/tokens/layout";
import { Image } from "expo-image";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin, MessageCircle, X } from "lucide-react-native";
import { MapSize, MapSpacing } from "../tokens";
import { CategoryIconRenderer } from "./map-pin";
import type { TripMapActivity } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_COMMENT_AVATARS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type MapLocationDetailSheetProps = {
  activity: TripMapActivity;
  onClose: () => void;
  onViewActivity: (activityId: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function MapLocationDetailSheetContent({
  activity,
  onClose,
  onViewActivity,
}: MapLocationDetailSheetProps) {
  const imageUri = activity.thumbnail_url ?? activity.media_url;
  const commentCount = activity.comment_count ?? 0;
  const commentPreviews = activity.comment_previews ?? [];

  const handleOpenInMaps = async () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${activity.location_lat},${activity.location_lng}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot Open Maps",
          "Unable to open Google Maps on this device.",
        );
      }
    } catch {
      Alert.alert("Error", "Something went wrong while opening the map.");
    }
  };

  return (
    // Figma: pt-[16px] px-[16px] pb-[32px] gap-[10px]
    <View style={styles.container}>
      {/* ── Header group: name/address row + Open Maps CTA ── */}
      <View style={styles.topGroup}>
        {/* Figma: flex-row gap-[8px] min-h-[44px] items-start */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text variant="bodyStrong" color="gray950" numberOfLines={2}>
              {activity.name}
            </Text>
            {activity.location_name ? (
              <View style={styles.addressRow}>
                <MapPin size={14} color={ColorPalette.gray500} />
                <Text
                  variant="bodySmMedium"
                  color="gray500"
                  numberOfLines={1}
                  style={styles.addressText}
                >
                  {activity.location_name}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Figma: rounded-[8px], 20px icon */}
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={Layout.spacing.xs}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={CoreSize.iconSm} color={ColorPalette.gray950} />
          </Pressable>
        </View>

        {/* Figma: brand500, full width, 44px height, rounded-md */}
        <Button
          variant="Primary"
          layout="textOnly"
          label="Open in Google Maps"
          onPress={handleOpenInMaps}
        />
      </View>

      {/* ── Image — Figma: h-[194px] w-full rounded-[11px] bg-gray-50 ── */}
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </View>
      ) : (
        <View style={[styles.imageContainer, styles.imageFallback]}>
          <CategoryIconRenderer
            categoryNames={activity.category_names}
            size={CoreSize.lg}
            color={ColorPalette.gray300}
          />
        </View>
      )}

      {/* ── Comments row — Figma: flex-1 bg-gray-25 px-[8px] py-[6px] rounded-md ── */}
      <View style={styles.engagementRow}>
        <Pressable style={styles.commentsPill}>
          <View style={styles.commentsPillInner}>
            <View style={styles.avatarStack}>
              {commentPreviews
                .slice(0, MAX_COMMENT_AVATARS)
                .map((user, index) => (
                  <View
                    key={user.user_id ?? index}
                    style={[
                      // Figma: mr-[-4px] overlap between 16px avatars
                      index > 0 && { marginLeft: -Layout.spacing.xxs },
                      { zIndex: 1 },
                    ]}
                  >
                    <Avatar
                      variant="xs"
                      seed={user.user_id ?? String(index)}
                      profilePhoto={user.profile_picture_url ?? undefined}
                    />
                  </View>
                ))}
              {commentPreviews.length === 0 && (
                <MessageCircle
                  size={CoreSize.xs}
                  color={ColorPalette.gray500}
                />
              )}
            </View>
            <Text variant="bodySmStrong" color="gray950">
              {commentCount > 0
                ? `${commentCount} comments`
                : "No comments yet"}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ── View activity — Figma: gray50 bg, rounded-md, full width ── */}
      <Button
        variant="Secondary"
        layout="textOnly"
        label={`View "${activity.name}"`}
        onPress={() => onViewActivity(activity.id)}
      />

      <SafeAreaView edges={["bottom"]} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Figma: pt-[16px] px-[16px] pb-[32px] gap-[10px]
  container: {
    paddingTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.lg,
    gap: MapSpacing.detailSectionGap,
  },
  topGroup: {
    gap: MapSpacing.detailSectionGap,
  },
  // Figma: flex-row gap-[8px] min-h-[44px] items-start
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Layout.spacing.xs,
    minHeight: CoreSize.tap,
  },
  headerText: {
    flex: 1,
    gap: Layout.spacing.xxs,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
  },
  addressText: {
    flex: 1,
  },
  // Figma: rounded-[8px], 32×32, contains 20px icon
  closeButton: {
    width: CoreSize.md,
    height: CoreSize.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CornerRadius.sm,
    flexShrink: 0,
  },
  // Figma: h-[194px] w-full rounded-[11.325px] bg-gray-50
  imageContainer: {
    height: MapSize.detailImageHeight,
    borderRadius: MapSize.imageThumbnailRadius,
    overflow: "hidden",
    backgroundColor: ColorPalette.gray50,
  },
  image: {
    width: "100%",
    height: MapSize.detailImageHeight,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Figma: gap-[4px] between pills
  engagementRow: {
    flexDirection: "row",
    gap: Layout.spacing.xxs,
    alignItems: "stretch",
  },
  // Figma: flex-1 bg-gray-25 px-[8px] py-[6px] rounded-[12px]
  commentsPill: {
    flex: 1,
    backgroundColor: ColorPalette.gray25,
    borderRadius: CornerRadius.md,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: MapSpacing.innerGap,
  },
  // Figma: gap-[6px]
  commentsPillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.innerGap,
  },
  // Figma: h-[16px] (xs avatar height)
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    height: CoreSize.xs,
  },
});
