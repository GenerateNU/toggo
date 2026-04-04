import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Elevation } from "@/design-system/tokens/elevation";
import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import { Pressable } from "react-native";

import { Icon } from "../icons/icon";

const TRIP_CARD_IMAGE_HEIGHT = 140;

export type TripCardProps = {
  title: string;
  coverImageUrl?: string | null;
  onPress: () => void;
  testID?: string;
};

export function TripCard({
  title,
  coverImageUrl,
  onPress,
  testID,
}: TripCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open trip, ${title}`}
      testID={testID}
    >
      <Box
        borderRadius="md"
        backgroundColor="white"
        overflow="hidden"
        style={Elevation.sm}
      >
        {coverImageUrl ? (
          <Image
            source={{ uri: coverImageUrl }}
            style={{ width: "100%", height: TRIP_CARD_IMAGE_HEIGHT }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Box
            height={TRIP_CARD_IMAGE_HEIGHT}
            width="100%"
            backgroundColor="gray50"
            justifyContent="center"
            alignItems="center"
          >
            <Icon icon={MapPin} size="md" color="gray500" />
          </Box>
        )}
        <Box padding="sm" gap="xxs">
          <Text variant="headingSm" color="gray900" numberOfLines={2}>
            {title}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}
