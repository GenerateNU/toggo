import { Box, Icon, Text } from "@/design-system";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronRight, ImageIcon } from "lucide-react-native";
import { Pressable } from "react-native";

type TripCardProps = {
  trip: ModelsTripAPIResponse;
};

export function TripCard({ trip }: TripCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/trips/${trip.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        marginHorizontal="sm"
        borderWidth={1}
        borderColor="gray100"
        borderRadius="sm"
        backgroundColor="white"
        overflow="hidden"
        gap="md"
      >
        <Box
          width={72}
          height={72}
          backgroundColor="gray50"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          {trip.cover_image_url ? (
            <Image
              source={{ uri: trip.cover_image_url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <Icon icon={ImageIcon} size="sm" color="gray500" />
          )}
        </Box>

        <Box flex={1} gap="xxs">
          <Text variant="bodySmMedium" color="gray900" numberOfLines={1}>
            {trip.name ?? "Unnamed Trip"}
          </Text>
          <Text
            variant="bodyXsDefault"
            color="gray500"
            numberOfLines={1}
            style={{ fontFamily: "monospace" }}
          >
            {trip.id}
          </Text>
        </Box>

        <Box paddingRight="md">
          <Icon icon={ChevronRight} size="xs" color="gray500" />
        </Box>
      </Box>
    </Pressable>
  );
}

export default TripCard;
