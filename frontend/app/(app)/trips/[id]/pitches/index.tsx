import { Box, Screen, Text } from "@/design-system";

export default function Pitches() {
  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="backgroundCard"
      >
        <Text variant="headingMd" color="textInverse">
          Pitches Page
        </Text>
      </Box>
    </Screen>
  );
}
