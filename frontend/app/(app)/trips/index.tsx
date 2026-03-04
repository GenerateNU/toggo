import { Box, Screen, Text } from "@/design-system";

export default function Trips() {
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
        <Text variant="lgHeading" color="black">
          Trips
        </Text>
      </Box>
    </Screen>
  );
}
