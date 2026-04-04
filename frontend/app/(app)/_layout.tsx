import { useUser } from "@/contexts/user";
import { BackButton, Box, Button, Logo, ProfileAvatarButton, ToastProvider } from "@/design-system";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { useCreateTrip } from "@/index";
import { Redirect, router, Stack } from "expo-router";
import { PlusIcon } from "lucide-react-native";

// ─── Home header components ───────────────────────────────────────────────────

function HomeHeaderLeft() {
  const profile = useProfileAvatar();
  return (
    <ProfileAvatarButton
      profilePhoto={profile.profilePhotoUri}
      seed={profile.seed}
      size="lg"
      accessibilityLabel={profile.accessibilityLabel}
      onPress={() => router.push("/settings")}
    />
  );
}

function HomeHeaderRight() {
  const createTripMutation = useCreateTrip();

  const handleCreateTrip = async () => {
    try {
      const result = await createTripMutation.mutateAsync({
        data: { name: "Trip Name", budget_min: 1, budget_max: 1000 },
      });
      if (result?.id) router.push(`/trips/${result.id}`);
    } catch {}
  };

  return (
    <Button accessibilityLabel="Create a trip" icon={PlusIcon} variant="IconSecondary" layout="iconOnly" onPress={handleCreateTrip} />
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

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
            headerShown: true,
            headerTransparent: true,
            headerTitle: () => <Box paddingTop="sm"><Logo size="xl" /></Box>,
            headerTitleAlign: "center",
            headerShadowVisible: false,
            headerLeft: () => <HomeHeaderLeft />,
            headerRight: () => <HomeHeaderRight />,
            gestureEnabled: false,
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
