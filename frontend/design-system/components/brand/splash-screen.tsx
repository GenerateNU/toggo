import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";

export function SplashScreen() {
  return (
    <Box
      flex={1}
      backgroundColor="backgroundCard"
      justifyContent="center"
      alignItems="center"
      padding="lg"
      paddingBottom="xl"
    >
      <Box gap="xs">
        <Text variant="headingXl" color="textInverse">
          group trips shouldn't die in the group chat
        </Text>
      </Box>
    </Box>
  );
}
