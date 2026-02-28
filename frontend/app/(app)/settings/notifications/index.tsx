import { Box, Text } from "@/design-system";

export default function Notifications() {
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="white"
    >
      <Text variant="lgHeading" color="black">
        Notifications
      </Text>
    </Box>
  );
}
