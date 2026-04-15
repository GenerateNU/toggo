import { useUpdateUser } from "@/api/users/useUpdateUser";
import { useUser } from "@/contexts/user";
import {
  BackButton,
  Box,
  EmptyState,
  Spinner,
  Text,
  Toggle,
  useToast,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { Stack } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProviderKey = "apple_maps_enabled" | "google_maps_enabled";

function SettingRow({
  title,
  value,
  onToggle,
  disabled,
}: {
  title: string;
  value: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} style={styles.row}>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingBottom="sm"
      >
        <Text variant="bodyMedium" color="gray950">
          {title}
        </Text>
        <Toggle value={value} onChange={onToggle}  onColor={ColorPalette.blue500} />
      </Box>
      <Box height={StyleSheet.hairlineWidth} backgroundColor="gray200" />
    </Pressable>
  );
}

export default function MapsSettingsScreen() {
  const { currentUser, refreshCurrentUser, isPending } = useUser();
  const { mutateAsync: updateUser, isPending: isSaving } = useUpdateUser();
  const toast = useToast();

  const appleEnabled = currentUser?.apple_maps_enabled ?? true;
  const googleEnabled = currentUser?.google_maps_enabled ?? true;

  const handleToggle = async (field: ProviderKey, next: boolean) => {
    if (!currentUser?.id) return;

    const data =
      field === "apple_maps_enabled"
        ? {
            apple_maps_enabled: next,
            google_maps_enabled: !next,
          }
        : {
            apple_maps_enabled: !next,
            google_maps_enabled: next,
          };

    try {
      await updateUser({
        userID: currentUser.id,
        data,
      });
      await refreshCurrentUser();
    } catch {
      toast.show({
        message: "Couldn't update map settings. Please try again.",
      });
    }
  };

  if (isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner />
        </Box>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <Box flex={1} justifyContent="center">
          <EmptyState
            title="Settings unavailable"
            description="Sign in again to manage map preferences."
          />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="sm"
        paddingVertical="xs"
      >
        <BackButton />
        <Text variant="bodyMedium" color="gray950">
          Map Settings
        </Text>
        <Box width={36} height={36} />
      </Box>

      <Text variant="bodyDefault" color="gray700" style={styles.subtitle}>
        Customize your map view to best match your needs.
      </Text>

      <Box paddingHorizontal="sm" gap="sm">
        <SettingRow
          title="Apple Maps"
          value={appleEnabled}
          onToggle={(next) => handleToggle("apple_maps_enabled", next)}
          disabled={isSaving}
        />

        <SettingRow
          title="Google Maps"
          value={googleEnabled}
          onToggle={(next) => handleToggle("google_maps_enabled", next)}
          disabled={isSaving}
        />
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Layout.spacing.xs,
    paddingBottom: Layout.spacing.sm,
  },
  row: {
    backgroundColor: ColorPalette.white,
  },
});
