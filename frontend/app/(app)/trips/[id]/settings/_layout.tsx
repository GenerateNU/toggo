import { BackButton } from "@/design-system/components/navigation/arrow";
import { ColorPalette } from "@/design-system/tokens/color";
import { Stack } from "expo-router";

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: ColorPalette.white },
  headerTitleStyle: { color: ColorPalette.gray900 },
  headerTintColor: ColorPalette.gray900,
  headerShadowVisible: false,
  headerBackVisible: false,
  headerTitleAlign: "center" as const,
  headerLeft: () => <BackButton />,
};

export default function SettingsLayout() {
  return (
    <Stack screenOptions={HEADER_OPTIONS}>
      <Stack.Screen
        name="index"
        options={{
          title: "Trip Settings",
        }}
      />
      <Stack.Screen name="members" options={{ title: "Members" }} />
      <Stack.Screen name="edit-name" options={{ title: "Trip Name" }} />
      <Stack.Screen name="edit-dates" options={{ title: "Dates" }} />
    </Stack>
  );
}
