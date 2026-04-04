import { useUpdateUser } from "@/api/users/useUpdateUser";
import { useUser } from "@/contexts/user";
import { Box, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { router, Stack } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(" ");
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box paddingHorizontal="sm" paddingVertical="sm">
      <Text variant="bodyXsDefault" color="gray500" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="bodyDefault" color="gray950" style={styles.rowValue}>
        {value || "—"}
      </Text>
    </Box>
  );
}

function RowDivider() {
  return (
    <Box
      height={StyleSheet.hairlineWidth}
      backgroundColor="gray200"
      marginLeft="sm"
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { currentUser, refreshCurrentUser } = useUser();
  const { mutateAsync: updateUser, isPending: isSaving } = useUpdateUser();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (currentUser?.name) {
      const { firstName: fn, lastName: ln } = splitName(currentUser.name);
      setFirstName(fn);
      setLastName(ln);
    }
  }, [currentUser?.name]);

  const handleEdit = () => setIsEditing(true);

  const handleDone = async () => {
    if (!currentUser?.id) return;
    const fullName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
    try {
      await updateUser({ userID: currentUser.id, data: { name: fullName } });
      await refreshCurrentUser();
    } catch {
      // non-blocking
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (currentUser?.name) {
      const { firstName: fn, lastName: ln } = splitName(currentUser.name);
      setFirstName(fn);
      setLastName(ln);
    }
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="sm"
          paddingVertical="xs"
        >
          <TouchableOpacity
            onPress={isEditing ? handleCancel : router.back}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? "Cancel" : "Go back"}
          >
            <ChevronRight
              size={20}
              color={ColorPalette.gray950}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          </TouchableOpacity>

          <Text variant="bodyMedium" color="gray950">
            Account
          </Text>

          <TouchableOpacity
            onPress={isEditing ? handleDone : handleEdit}
            disabled={isSaving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? "Done" : "Edit"}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={ColorPalette.blue400} />
            ) : (
              <Text
                variant="bodySmDefault"
                style={{
                  color: isEditing
                    ? ColorPalette.gray950
                    : ColorPalette.blue400,
                }}
              >
                {isEditing ? "Done" : "Edit"}
              </Text>
            )}
          </TouchableOpacity>
        </Box>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isEditing ? (
            // ─── Edit mode ───────────────────────────────────────────────
            <Box paddingHorizontal="sm" gap="lg">
              <TextField
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <TextField
                label="Phone Number"
                value={currentUser?.phone_number ?? ""}
                onChangeText={() => {}}
                disabled
                keyboardType="phone-pad"
              />
            </Box>
          ) : (
            // ─── View mode ───────────────────────────────────────────────
            <Box
              backgroundColor="white"
              borderRadius="md"
              marginHorizontal="sm"
            >
              <FieldRow label="First Name" value={firstName} />
              <RowDivider />
              <FieldRow label="Last Name" value={lastName || "—"} />
              <RowDivider />
              <FieldRow
                label="Phone Number"
                value={currentUser?.phone_number}
              />
            </Box>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: CornerRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ColorPalette.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
  actionButton: {
    width: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: Layout.spacing.sm,
    paddingBottom: Layout.spacing.xxl,
  },
  rowLabel: {
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 17,
  },
});
