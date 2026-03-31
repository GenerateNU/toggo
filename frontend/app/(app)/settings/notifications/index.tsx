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
        backgroundColor="backgroundCard"
      >
        <Text variant="headingMd" color="textInverse">
          Notifications
        </Text>
      </Box>
    </Screen>
  );
}
