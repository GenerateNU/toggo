import { Box, Screen, Text } from "@/design-system";

export default function Activities() {
  return (
    <Screen>
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="backgroundCard"
      >
        <Text variant="headingMd" color="textInverse">
          Activities Page
        </Text>
      </Box>
    </Screen>
  );
}
