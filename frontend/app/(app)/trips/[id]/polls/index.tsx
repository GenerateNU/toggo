import { Box, Screen, Text } from "@/design-system";

export default function Polls() {
  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="backgroundCard"
      >
        <Text variant="headingMd" color="textInverse">
          Polls Page
        </Text>
      </Box>
    </Screen>
  );
}
