import { Box, Text } from "@/design-system";
import { StyleSheet } from "react-native";

export function ItineraryEmptyState() {
  return (
    <Box borderWidth={1} borderColor="gray200" borderRadius="xl" padding="sm">
      <Box alignItems="center" paddingVertical="lg">
        <Text
          variant="bodySmDefault"
          color="gray950"
          style={styles.emptyStateText}
        >
          No activities planned. Get planning!
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
