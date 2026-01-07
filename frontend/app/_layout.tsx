import { UserProvider } from "@/contexts/user";
import { getTheme } from "@/design-system/config/theme";
import { ThemeProvider } from "@shopify/restyle";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
