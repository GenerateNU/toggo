import { useUser } from "@/contexts/user";
import { BackButton } from "@/design-system";
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
        options={{
          headerShown: false,
          gestureEnabled: false,
          headerLeft: () => <BackButton />,
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
        name="ui-kit"
        options={{
          headerTransparent: true,
          headerShown: false,
          headerTitle: "",
          headerShadowVisible: false,
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
};

export default Layout;
