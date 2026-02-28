import { Box, UIKitDisplay } from "@/design-system";
import { ScrollView } from "react-native";

export default function Home() {
  return (
    <Box flex={1} backgroundColor="white">
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
  );
}
