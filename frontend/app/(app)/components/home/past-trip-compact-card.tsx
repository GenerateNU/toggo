import { Box, Icon, Text } from "@/design-system";
import { Elevation } from "@/design-system/tokens/elevation";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { Pressable } from "react-native";
import { HOME_PAST_TRIP_IMAGE_SIZE } from "./constants";
import { TripMemberPreviewRow } from "./trip-member-preview-row";
import { tripMemberPreviews } from "./types";

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
        style={Elevation.sm}
        alignItems="flex-start"
      >
        <Box borderRadius="sm" overflow="hidden" flexShrink={0} alignSelf="stretch">
          {trip.cover_image_url ? (
            <Image
              source={{ uri: trip.cover_image_url }}
              style={{ width: HOME_PAST_TRIP_IMAGE_SIZE, height: undefined, aspectRatio: 1, flex: 1 }}
              contentFit="cover"
            />
          ) : (
            <Box
              width={HOME_PAST_TRIP_IMAGE_SIZE}
              flex={1}
              aspectRatio={2}
              alignItems="center"
              justifyContent="center"
              backgroundColor="gray50"
            >
              <Icon icon={MapPin} size="sm" color="gray500" />
            </Box>
          )}
        </Box>

        <Box gap="xxs" justifyContent="center">
          <Text variant="bodyStrong" color="gray950" numberOfLines={1}>
            {trip.name?.trim() || "Untitled trip"}
          </Text>
          {dateLabel ? (
            <Text variant="bodySmDefault" color="gray500">
              {dateLabel}
            </Text>
          ) : null}
          <TripMemberPreviewRow
            members={tripMemberPreviews(trip)}
            currentUserId={currentUserId}
            textSize="small"
          />
        </Box>
      </Box>
    </Pressable>
  );
}

export default PastTripCompactCard;