import { Box, Button, Text } from "@/design-system";
import { HOME_CARD_FLOATING_SHADOW } from "./constants";

type HomeUpcomingEmptyCardProps = {
  onPressCreateTrip: () => void;
  onPressTripCode: () => void;
};

export function HomeUpcomingEmptyCard({
  onPressCreateTrip,
  onPressTripCode,
}: HomeUpcomingEmptyCardProps) {
  return (
    <Box
      backgroundColor="white"
      borderRadius="lg"
      padding="sm"
      gap="sm"
      style={HOME_CARD_FLOATING_SHADOW}
    >
      <Box alignItems="center" paddingVertical="md" gap="xxs">
        <Text style={{ fontSize: 48, lineHeight: 64 }}>🌎</Text>
        <Text
          variant="bodySmDefault"
          color="gray900"
          style={{
            textAlign: "center",
            fontFamily: "Figtree-Italic",
          }}
        >
          No upcoming trips. Get planning!
        </Text>
      </Box>

      <Button
        layout="textOnly"
        variant="Primary"
        label="Create a trip"
        onPress={onPressCreateTrip}
      />

      <Button
        layout="textOnly"
        variant="Tertiary"
        label="I have a trip code"
        onPress={onPressTripCode}
      />
    </Box>
  );
}

export default HomeUpcomingEmptyCard;
