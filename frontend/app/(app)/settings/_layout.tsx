import { useUser } from "@/contexts/user";
import { BackButton } from "@/design-system/components/navigation/arrow";
import { Redirect, Stack } from "expo-router";

const Layout = () => {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerLeft: () => <BackButton />,
        headerBackVisible: false,
        headerTitleAlign: "center",
        headerTransparent: true,
        headerTitle: "",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="accounts"
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
};

export default Layout;
