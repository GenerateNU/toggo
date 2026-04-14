import { Box, Text } from "@/design-system";

export function NewEmptyState() {
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
        <Text
          variant="bodyMedium"
          color="gray950"
          textAlign="center"
          marginBottom="sm"
        >
          No new updates yet. Check back later!
        </Text>
      </Box>
    </Box>
  );
}

export default NewEmptyState;
