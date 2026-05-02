import { useUser } from "@/contexts/user";
import { Redirect, Stack } from "expo-router";

const Layout = () => {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
        headerTitleAlign: "center",
        headerTransparent: true,
        headerTitle: "",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          headerTitle: "",
          headerTransparent: true,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="activity-all-media"
        options={{
          headerShown: false,
          headerTitle: "",
          headerTransparent: true,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
};

export default Layout;
