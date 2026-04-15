import { useUpdateUser } from "@/api/users/useUpdateUser";
import { useUser } from "@/contexts/user";
import { BackButton, Box, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { router, Stack } from "expo-router";
import { Check } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Addis_Ababa",
  "Africa/Algiers",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Lima",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Colombo",
  "Asia/Dubai",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Qatar",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Atlantic/Azores",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Guam",
  "Pacific/Honolulu",
  "UTC",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimezoneScreen() {
  const { currentUser, refreshCurrentUser } = useUser();
  const { mutateAsync: updateUser } = useUpdateUser();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return TIMEZONES;
    return TIMEZONES.filter((tz) => tz.toLowerCase().includes(query));
  }, [search]);

  const handleSelect = async (timezone: string) => {
    if (!currentUser?.id) return;
    try {
      await updateUser({ userID: currentUser.id, data: { timezone } });
      await refreshCurrentUser();
    } catch {
      // non-blocking
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="sm"
        paddingVertical="xs"
      >
        <BackButton onPress={router.back} />
        <Text variant="bodyMedium" color="gray950">
          Time Zone
        </Text>
        <Box style={styles.headerSpacer} />
      </Box>

      <Box paddingHorizontal="sm" paddingVertical="xs">
        <TextField
          placeholder="Search timezones…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </Box>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <Box
            height={StyleSheet.hairlineWidth}
            backgroundColor="gray200"
            marginLeft="sm"
          />
        )}
        renderItem={({ item }) => {
          const isSelected = item === currentUser?.timezone;
          return (
            <Pressable onPress={() => handleSelect(item)}>
              <Box
                paddingHorizontal="sm"
                paddingVertical="md"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Text
                  variant="bodyDefault"
                  color={isSelected ? "brand500" : "gray950"}
                >
                  {item}
                </Text>
                {isSelected && (
                  <Check size={16} color={ColorPalette.brand500} />
                )}
              </Box>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  headerSpacer: {
    width: 60,
  },
  listContent: {
    paddingBottom: Layout.spacing.xxl,
  },
});
