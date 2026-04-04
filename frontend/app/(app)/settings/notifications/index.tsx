import { getNotificationPreferencesQueryKey, useGetNotificationPreferences } from "@/api/notification-preferences/useGetNotificationPreferences";
import { useGetOrCreateDefaultNotificationPreferences } from "@/api/notification-preferences/useGetOrCreateDefaultNotificationPreferences";
import { useUpdateNotificationPreferences } from "@/api/notification-preferences/useUpdateNotificationPreferences";
import { BackButton, Box, Text, Toggle } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsNotificationPreferences } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToggleField = keyof Pick<
  ModelsNotificationPreferences,
  | "upcoming_trip"
  | "voting_reminders"
  | "finalized_decisions"
  | "trip_activity"
  | "deadline_reminders"
>;

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_ITEMS: {
  field: ToggleField;
  title: string;
  description: string;
}[] = [
  {
    field: "upcoming_trip",
    title: "Days till planned trip",
    description: "Get countdown updates as your trip gets closer.",
  },
  {
    field: "voting_reminders",
    title: "Voting reminders",
    description: "Never miss a chance to vote on plans with your group.",
  },
  {
    field: "finalized_decisions",
    title: "Finalized decisions",
    description: "Stay updated when plans are confirmed.",
  },
  {
    field: "trip_activity",
    title: "Trip activity",
    description: "Get notified about new comments, updates, and changes.",
  },
  {
    field: "deadline_reminders",
    title: "Deadline reminders",
    description: "Keep track of important dates and deadlines.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotificationRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      backgroundColor="gray50"
      borderRadius="md"
      paddingHorizontal="sm"
      paddingVertical="sm"
    >
      <Box flex={1} gap="xxs" paddingRight="md">
        <Text variant="bodyDefault" color="gray950">
          {title}
        </Text>
        <Text variant="bodySmDefault" color="gray500">
          {description}
        </Text>
      </Box>
      <Toggle value={value} onChange={onChange} />
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { data: prefs } = useGetNotificationPreferences();
  const { mutate: ensureDefaults } =
    useGetOrCreateDefaultNotificationPreferences();
  const { mutate: updatePrefs } = useUpdateNotificationPreferences();

  // Ensure notification preferences exist on first visit
  useEffect(() => {
    if (!prefs) {
      ensureDefaults(undefined);
    }
  }, [prefs, ensureDefaults]);

  const handleToggle = (field: ToggleField, value: boolean) => {
    const queryKey = getNotificationPreferencesQueryKey();

    // Optimistic update so the toggle feels instant
    queryClient.setQueryData(
      queryKey,
      (prev: ModelsNotificationPreferences | undefined) =>
        prev ? { ...prev, [field]: value } : prev,
    );

    updatePrefs(
      { data: { [field]: value } },
      {
        onError: () => {
          // Revert on error
          queryClient.invalidateQueries({ queryKey });
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="sm"
        paddingVertical="xs"
      >
        <BackButton />

        <Text variant="bodyMedium" color="gray950">
          Notifications
        </Text>

        <Box width={36} height={36} />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text variant="bodyXxsDefault" color="gray500" style={styles.subtitle}>
          Customize your notifications to best match your needs.
        </Text>

        <Box gap="md" paddingHorizontal="sm">
          {NOTIFICATION_ITEMS.map((item) => (
            <NotificationRow
              key={item.field}
              title={item.title}
              description={item.description}
              value={prefs?.[item.field] ?? false}
              onChange={(val) => handleToggle(item.field, val)}
            />
          ))}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xxl,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Layout.spacing.xs,
    paddingBottom: Layout.spacing.lg,
  },
});
