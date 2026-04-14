import { Box, Text } from "@/design-system";
import { Image, StyleSheet } from "react-native";

export function ItineraryEmptyState() {
  return (
    <Box
      borderRadius="xxxl"
      padding="xs"
      shadowColor="black"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      shadowRadius={5}
      backgroundColor="white"
    >
      <Box alignItems="center" gap="sm">
        <Image
          source={require("@/assets/images/empty-itinerary.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <Text
          variant="bodyMedium"
          color="gray950"
          textAlign="center"
          marginBottom="sm"
        >
          Set the trip date and get planning!
        </Text>
      </Box>
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  image: {
    width: 200,
    height: 150,
  },
});

export default ItineraryEmptyState;
