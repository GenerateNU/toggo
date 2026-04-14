import { Box, Text } from "@/design-system";
import { StyleSheet } from "react-native";

type ItineraryEmptyStateProps = {
  hasDates?: boolean;
};

export function ItineraryEmptyState({ hasDates = true }: ItineraryEmptyStateProps) {
  const message = hasDates
    ? "No activities planned. Get planning!"
    : "Select your trip dates to start planning your itinerary.";

  return (
    <Box borderWidth={1} borderColor="gray200" borderRadius="xl" padding="sm">
      <Box alignItems="center" paddingVertical="lg">
        <Text
          variant="bodySmDefault"
          color="gray950"
          style={styles.emptyStateText}
        >
          {message}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyStateText: {
    fontStyle: "italic",
  },
});

export default ItineraryEmptyState;
