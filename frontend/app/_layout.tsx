import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot } from "expo-router";
import { ThemeProvider } from "@shopify/restyle";
import { getTheme } from "@/design-system/config/theme";
import { UserProvider } from "@/contexts/user";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <ThemeProvider theme={getTheme()}>
        <UserProvider>
          <Slot />
        </UserProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
