import { Box, Icon, Text } from "@/design-system";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { Pressable } from "react-native";
import {
  HOME_CARD_FLOATING_SHADOW,
  HOME_PAST_TRIP_IMAGE_SIZE,
} from "./constants";
import { TripMemberPreviewRow } from "./trip-member-preview-row";

type PastTripCompactCardProps = {
  trip: ModelsTripAPIResponse;
  dateLabel: string | null;
  currentUserId?: string | null;
};

export function PastTripCompactCard({
  trip,
  dateLabel,
  currentUserId,
}: PastTripCompactCardProps) {
  const tripId = trip.id;
  if (!tripId) return null;

  return (
    <Pressable onPress={() => router.push(`/trips/${tripId}`)}>
      <Box
        backgroundColor="white"
        borderRadius="lg"
        padding="xs"
        flexDirection="row"
        gap="sm"
        style={HOME_CARD_FLOATING_SHADOW}
      >
        <Box borderRadius="sm" overflow="hidden">
          {trip.cover_image_url ? (
            <Image
              source={{ uri: trip.cover_image_url }}
              style={{
                width: HOME_PAST_TRIP_IMAGE_SIZE,
                height: HOME_PAST_TRIP_IMAGE_SIZE,
              }}
              contentFit="cover"
            />
          ) : (
            <Box
              width={HOME_PAST_TRIP_IMAGE_SIZE}
              height={HOME_PAST_TRIP_IMAGE_SIZE}
              alignItems="center"
              justifyContent="center"
              backgroundColor="gray50"
            >
              <Icon icon={MapPin} size="sm" color="gray500" />
            </Box>
          )}
        </Box>

        <Box flex={1} gap="xxs" justifyContent="center">
          <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
            {trip.name?.trim() || "Untitled trip"}
          </Text>
          {dateLabel ? (
            <Text variant="bodySmDefault" color="gray500">
              {dateLabel}
            </Text>
          ) : null}
          <TripMemberPreviewRow
            tripId={tripId}
            currentUserId={currentUserId}
            textSize="small"
          />
        </Box>
      </Box>
    </Pressable>
  );
}

export default PastTripCompactCard;
