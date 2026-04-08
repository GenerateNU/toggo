import { Box, Text } from "@/design-system";
import { Image } from "expo-image";
import { ScrollView } from "react-native";
import {
  HOME_RECOMMENDED_CARD_WIDTH,
  RECOMMENDED_DESTINATIONS,
} from "./constants";

export function RecommendedTripsRow() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Box flexDirection="row" gap="sm" paddingHorizontal="sm" paddingVertical="sm">
        {RECOMMENDED_DESTINATIONS.map((destination, index) => (
          <Box
            key={destination.id}
            width={HOME_RECOMMENDED_CARD_WIDTH}
            borderRadius="md"
            backgroundColor="white"
            shadowColor="black"
            shadowOpacity={0.2}
            shadowOffset={{ width: 0, height: 2 }}
            shadowRadius={7}
            padding="xs"
            gap="sm"
            style={index === 0 ? { transform: [{ rotate: "-1deg" }] } : undefined}
          >
            <Box height={166} borderRadius="sm" overflow="hidden">
              <Image
                source={{ uri: destination.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </Box>
            <Box gap="xxs">
              <Text variant="bodySmStrong" color="gray900">
                {destination.title}
              </Text>
              <Text variant="bodyXsDefault" color="gray500" numberOfLines={3}>
                {destination.description}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </ScrollView>
  );
}

export default RecommendedTripsRow;
