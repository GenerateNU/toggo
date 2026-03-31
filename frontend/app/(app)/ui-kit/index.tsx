import { Box, Screen, UIKitDisplay } from "@/design-system";
import { ScrollView } from "react-native";

export default function Home() {
  return (
    <Screen>
      <Box flex={1} backgroundColor="backgroundCard">
        <ScrollView
          contentContainerStyle={{
            paddingTop: 32,
            paddingHorizontal: 32,
            gap: 32,
            paddingBottom: 64,
          }}
        >
          <UIKitDisplay />
        </ScrollView>
      </Box>
    </Screen>
  );
}
