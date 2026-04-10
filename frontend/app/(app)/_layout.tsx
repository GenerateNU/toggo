import { useUser } from "@/contexts/user";
import { BackButton, ToastProvider } from "@/design-system";
import { Redirect, Stack } from "expo-router";

const Layout = () => {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ToastProvider position="bottom">
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="testing"
          options={{
            headerTransparent: true,
            headerShown: false,
            headerTitle: "",
            headerShadowVisible: false,
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ui-kit"
          options={{
            headerTransparent: true,
            headerShown: false,
            headerTitle: "",
            headerShadowVisible: false,
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="join-trip-code"
          options={{
            headerTransparent: true,
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="map-view"
          options={{
            headerTransparent: true,
            headerShown: true,
            headerTitle: "Map",
            headerShadowVisible: false,
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="trips"
          options={{
            headerTransparent: true,
            headerShown: false,
            headerTitle: "",
            headerShadowVisible: false,
            headerLeft: () => <BackButton />,
          }}
        />
      </Stack>
    </ToastProvider>
  );
};

export default Layout;
