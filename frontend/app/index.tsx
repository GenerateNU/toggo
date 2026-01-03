import { Box } from "@/design-system/base/box";
import { Text } from "@/design-system/base/text";

export default function HomeScreen() {
  return (
    <Box backgroundColor="sandyBeige" flex={1} alignItems="center" justifyContent="center">
      <Text color="forestGreen" variant="bodyLargeBold">Welcome to Toggo 🌆🚌✈️!</Text>
    </Box>
  );
}
