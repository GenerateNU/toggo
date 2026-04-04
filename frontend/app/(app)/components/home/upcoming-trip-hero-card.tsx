import { useGetUnreadActivityCount } from "@/api/activity-feed/useGetUnreadActivityCount";
import { Box, Icon, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { BellDot, CalendarDays, MapPin } from "lucide-react-native";
import { Pressable } from "react-native";
import {
  HOME_CARD_FLOATING_SHADOW,
  HOME_UPCOMING_IMAGE_HEIGHT,
} from "./constants";
import { TripMemberPreviewRow } from "./trip-member-preview-row";

type UpcomingTripHeroCardProps = {
  trip: ModelsTripAPIResponse;
  dateLabel: string | null;
  currentUserId?: string | null;
  width?: number;
};

export function UpcomingTripHeroCard({
  trip,
  dateLabel,
  currentUserId,
  width,
}: UpcomingTripHeroCardProps) {
  const tripId = trip.id;
  const unreadCountQuery = useGetUnreadActivityCount(tripId ?? "");
  if (!tripId) return null;
  const unreadCount = unreadCountQuery.data?.unread_count ?? 0;
  const hasUnreadUpdates = unreadCount > 0;

  const updatesLabel = hasUnreadUpdates
    ? `View ${unreadCount} new update${unreadCount === 1 ? "" : "s"}`
    : "View updates";
  const updatesColor = hasUnreadUpdates ? "blue500" : "brand600";
  const updatesGradientColors = hasUnreadUpdates
    ? [ColorPalette.blue25, ColorPalette.blue100]
    : [ColorPalette.brand25, ColorPalette.brand200];

  return (
    <Pressable onPress={() => router.push(`/trips/${tripId}`)}>
      <Box
        backgroundColor="white"
        borderRadius="md"
        padding="xs"
        gap="sm"
        style={[HOME_CARD_FLOATING_SHADOW, width ? { width } : undefined]}
      >
        <Box borderRadius="sm" overflow="hidden">
          {trip.cover_image_url ? (
            <Image
              source={{ uri: trip.cover_image_url }}
              style={{ width: "100%", height: HOME_UPCOMING_IMAGE_HEIGHT }}
              contentFit="cover"
            />
          ) : (
            <Box
              height={HOME_UPCOMING_IMAGE_HEIGHT}
              alignItems="center"
              justifyContent="center"
              backgroundColor="gray50"
            >
              <Icon icon={MapPin} size="lg" color="gray500" />
            </Box>
          )}
          {dateLabel ? (
            <Box
              position="absolute"
              top={8}
              left={8}
              borderRadius="sm"
              backgroundColor="white"
              paddingHorizontal="xs"
              paddingVertical="xxs"
              flexDirection="row"
              alignItems="center"
              gap="xxs"
              style={{ opacity: 0.9 }}
            >
              <Icon icon={CalendarDays} size="xs" color="gray900" />
              <Text variant="bodyXsMedium" color="gray900">
                {dateLabel}
              </Text>
            </Box>
          ) : null}
        </Box>

        <Box paddingHorizontal="xs" paddingVertical="xxs">
          <Text variant="headingSm" color="gray900">
            {trip.name?.trim() || "Untitled trip"}
          </Text>
        </Box>

        <Box paddingHorizontal="xs">
          <TripMemberPreviewRow tripId={tripId} currentUserId={currentUserId} />
        </Box>

        <Box paddingHorizontal="xs">
          <Pressable onPress={() => router.push(`/trips/${tripId}`)}>
            <LinearGradient
              colors={updatesGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12 }}
            >
              <Box
                borderRadius="md"
                padding="sm"
                flexDirection="row"
                justifyContent="center"
                alignItems="center"
                gap="xs"
              >
                <Icon icon={BellDot} size="sm" color={updatesColor} />
                <Text variant="bodySmStrong" color={updatesColor}>
                  {updatesLabel}
                </Text>
              </Box>
            </LinearGradient>
          </Pressable>
        </Box>
      </Box>
    </Pressable>
  );
}
