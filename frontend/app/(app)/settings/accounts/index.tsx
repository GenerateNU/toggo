import { useUpdateUser } from "@/api/users/useUpdateUser";
import { useUser } from "@/contexts/user";
import { BackButton, Box, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { router, Stack } from "expo-router";
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
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    setName(currentUser?.name ?? "");
    setUsername(currentUser?.username ?? "");
    setPhoneNumber(currentUser?.phone_number ?? "");
  }, [currentUser]);

  const handleEdit = () => setIsEditing(true);

  const handleDone = async () => {
    if (!currentUser?.id) return;
    try {
      await updateUser({
        userID: currentUser.id,
        data: {
          name: name.trim() || undefined,
          username: username.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
        },
      });
      await refreshCurrentUser();
    } catch {
      // non-blocking
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setName(currentUser?.name ?? "");
    setUsername(currentUser?.username ?? "");
    setPhoneNumber(currentUser?.phone_number ?? "");
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
          <BackButton onPress={isEditing ? handleCancel : router.back} />

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
              <ActivityIndicator size="small" color="blue400" />
            ) : (
              <Text
                color={isEditing ? "gray950" : "blue400"}
                variant="bodySmDefault"
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
                label="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextField
                label="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextField
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
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
              <FieldRow label="Name" value={name} />
              <RowDivider />
              <FieldRow label="Username" value={username} />
              <RowDivider />
              <FieldRow label="Phone Number" value={phoneNumber} />
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
