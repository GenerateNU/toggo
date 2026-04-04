import { Box, Screen, Text } from "@/design-system";

export default function Polls() {
  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="white"
      >
        <Text variant="headingMd" color="gray900">
          Polls Page
        </Text>
      </Box>
    </Screen>
  );
}
