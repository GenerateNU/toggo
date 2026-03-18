import { Box, Screen, Text } from "@/design-system";

export default function Activities() {
  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="white"
      >
        <Text variant="lgHeading" color="black">
          Activities Page
        </Text>
      </Box>
    </Screen>
  );
}
