import { useUser } from "@/contexts/user";
import { BackButton } from "@/design-system";
import { Redirect, Stack } from "expo-router";

const Layout = () => {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTitle: "",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: "Settings",
          headerShadowVisible: false,
          headerTransparent: false,
          gestureEnabled: false,
          headerBackVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerLeft: () => <BackButton hasBackground />, 
        }}
      />
      <Stack.Screen
        name="accounts"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="timezone"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="maps"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default Layout;
