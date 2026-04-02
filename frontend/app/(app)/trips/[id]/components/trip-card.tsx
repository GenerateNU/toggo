import { Box, Icon, Text } from "@/design-system";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
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
        borderColor="borderSubtle"
        borderRadius="sm"
        paddingHorizontal="md"
        paddingVertical="md"
        gap="sm"
      >
        <Box flex={1} gap="xs">
          <Text variant="bodySmMedium" color="textInverse" numberOfLines={1}>
            {trip.name ?? "Unnamed Trip"}
          </Text>
          <Text variant="bodyXsMedium" color="textSubtle" numberOfLines={1}>
            {trip.id}
          </Text>
        </Box>
        <Icon icon={ChevronRight} size="xs" color="textSubtle" />
      </Box>
    </Pressable>
  );
}
