import { useUser } from "@/contexts/user";
import { Redirect, Stack } from "expo-router";

const Layout = () => {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="test-realtime"
        options={{ title: "Realtime Test", headerShown: true }}
      />
      <Stack.Screen
        name="test-poll"
        options={{ title: "Poll API Test", headerShown: true }}
      />
      <Stack.Screen
        name="test-maps"
        options={{ title: "Google Maps API Test", headerShown: true }}
      />
    </Stack>
  );
};

export default Layout;
