import { Box, Screen, Text } from "@/design-system";

export default function Notifications() {
  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding="lg"
        gap="md"
        backgroundColor="white"
      >
        <Text variant="headingMd" color="gray900">
          Notifications
        </Text>
      </Box>
    </Screen>
  );
}
