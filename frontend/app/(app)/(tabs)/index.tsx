import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";

export default function Home() {
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="l"
      gap="m"
    >
      <Text variant="bodyLargeBold">Welcome to Toggo ✨</Text>
      <Text variant="caption" color="forestGreen">
        Cool things will appear here soon!
      </Text>
    </Box>
  );
}
