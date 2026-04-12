import { NotificationProvider } from "@/contexts/notification";
import { UserProvider } from "@/contexts/user";
import { theme, ToastProvider } from "@/design-system";
import { PortalProvider } from "@gorhom/portal";
import { ThemeProvider } from "@shopify/restyle";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);

  const [fontsLoaded] = useFonts({
    "Figtree-Light": require("../assets/fonts/Figtree-Light.ttf"),
    "Figtree-LightItalic": require("../assets/fonts/Figtree-LightItalic.ttf"),
    "Figtree-Regular": require("../assets/fonts/Figtree-Regular.ttf"),
    "Figtree-Italic": require("../assets/fonts/Figtree-Italic.ttf"),
    "Figtree-Medium": require("../assets/fonts/Figtree-Medium.ttf"),
    "Figtree-MediumItalic": require("../assets/fonts/Figtree-MediumItalic.ttf"),
    "Figtree-SemiBold": require("../assets/fonts/Figtree-SemiBold.ttf"),
    "Figtree-SemiBoldItalic": require("../assets/fonts/Figtree-SemiBoldItalic.ttf"),
    "Figtree-Bold": require("../assets/fonts/Figtree-Bold.ttf"),
    "Figtree-BoldItalic": require("../assets/fonts/Figtree-BoldItalic.ttf"),
    "Figtree-ExtraBold": require("../assets/fonts/Figtree-ExtraBold.ttf"),
    "Figtree-ExtraBoldItalic": require("../assets/fonts/Figtree-ExtraBoldItalic.ttf"),
    "Figtree-Black": require("../assets/fonts/Figtree-Black.ttf"),
    "Figtree-BlackItalic": require("../assets/fonts/Figtree-BlackItalic.ttf"),
    "Zain-ExtraBold": require("../assets/fonts/Zain-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <UserProvider>
              <NotificationProvider>
                <ToastProvider>
                  <PortalProvider>
                    <StatusBar style="auto" />
                    <Slot />
                  </PortalProvider>
                </ToastProvider>
              </NotificationProvider>
            </UserProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
