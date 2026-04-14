import { useGetUnreadActivityCount } from "@/api/activity-feed/useGetUnreadActivityCount";
import { Box, Button, Icon, Text } from "@/design-system";
import { FontFamily } from "@/design-system/tokens/typography";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
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

  return (
    <Pressable onPress={() => router.push(`/trips/${tripId}`)}>
      <Box
        backgroundColor="white"
        borderRadius="lg"
        padding="xs"
        gap="xs"
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

        <Box paddingHorizontal="xs" gap="xxs">
          <Text
            color="gray950"
            style={{
              fontSize: 18,
              fontFamily: FontFamily.semiBold,
              lineHeight: 24,
            }}
          >
            {trip.name?.trim() || "Untitled trip"}
          </Text>
          <TripMemberPreviewRow tripId={tripId} currentUserId={currentUserId} />
        </Box>

        <Button
          label={updatesLabel}
          layout="leadingIcon"
          variant="Blue"
          leftIcon={BellDot}
          onPress={() => router.push(`/trips/${tripId}?tab=new`)}
        />
      </Box>
    </Pressable>
  );
}

export default UpcomingTripHeroCard;
