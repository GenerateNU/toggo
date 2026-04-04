import { useDeleteUser } from "@/api";
import { useUploadProfilePicture } from "@/api/files/custom/useUploadProfilePicture";
import { useUpdateUser } from "@/api/users/useUpdateUser";
import { useUser } from "@/contexts/user";
import { Box, Dialog, Icon, ImagePicker, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { router, Stack } from "expo-router";
import {
  Bell,
  ChevronRight,
  Languages,
  LogOut,
  Map,
  PenLine,
  Timer,
  Trash2,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsRowProps = {
  icon: React.ComponentType<any>;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsRow({
  icon: IconComponent,
  label,
  onPress,
  destructive = false,
}: SettingsRowProps) {
  const textColor = destructive ? "statusError" : "gray950";
  const iconColor = destructive
    ? ColorPalette.statusError
    : ColorPalette.gray950;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="md"
        backgroundColor="gray50"
        borderRadius="md"
        style={styles.row}
      >
        <Box flex={1} flexDirection="row" alignItems="center" gap="sm">
          <IconComponent size={20} color={iconColor} />
          <Text variant="bodyMedium" color={textColor}>
            {label}
          </Text>
        </Box>
        <ChevronRight size={16} color={ColorPalette.gray500} />
      </Box>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="headingMd" color="gray950">
      {title}
    </Text>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { currentUser, logout, isPending, refreshCurrentUser } = useUser();
  const { mutateAsync: uploadPhoto, isPending: isUploading } =
    useUploadProfilePicture();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const handlePhotoChange = async (uri: string | null) => {
    if (!uri || !currentUser?.id) return;
    try {
      const { imageId } = await uploadPhoto({ uri });
      await updateUser({
        userID: currentUser.id,
        data: { profile_picture: imageId },
      });
      await refreshCurrentUser();
    } catch {
      // non-blocking — user sees old photo
    }
  };

  const handleDeleteAccount = () => {
    if (!currentUser?.id) return;
    deleteUser({ userID: currentUser.id });
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
        <TouchableOpacity
          onPress={router.back}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon
            icon={ChevronRight}
            size="sm"
            color="gray950"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>

        <Text variant="bodyMedium" color="gray950">
          Settings
        </Text>

        {/* Invisible spacer to balance the header */}
        <View style={styles.headerButton} />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile section */}
        <Box alignItems="center" gap="sm" paddingVertical="md">
          <View style={styles.avatarContainer}>
            <ImagePicker
              variant="circular"
              size={AVATAR_SIZE}
              value={currentUser?.profile_picture ?? undefined}
              onChange={handlePhotoChange}
              disabled={isUploading}
            />
            <View style={styles.editBadge} pointerEvents="none">
              <PenLine size={12} color={ColorPalette.gray950} />
            </View>
          </View>

          <Box alignItems="center" gap="xxs">
            <Text variant="bodyMedium" color="gray950">
              {currentUser?.name ?? ""}
            </Text>
            <Text variant="bodyDefault" color="gray500">
              @{currentUser?.username ?? ""}
            </Text>
            {currentUser?.phone_number ? (
              <Text variant="bodySmDefault" color="gray500">
                {currentUser.phone_number}
              </Text>
            ) : null}
          </Box>
        </Box>

        {/* General section */}
        <Box paddingHorizontal="sm" paddingTop="sm" gap="xs">
          <SectionHeader title="General" />
          <Box gap="xs">
            <SettingsRow
              icon={User}
              label="Account"
              onPress={() => router.push("/settings/accounts" as any)}
            />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              onPress={() => router.push("/settings/notifications" as any)}
            />
            <SettingsRow
              icon={LogOut}
              label="Logout"
              onPress={() => setLogoutDialogVisible(true)}
            />
            <SettingsRow
              icon={Trash2}
              label="Delete Account"
              onPress={() => setDeleteDialogVisible(true)}
              destructive
            />
          </Box>
        </Box>

        {/* Preferences section */}
        <Box paddingHorizontal="sm" paddingTop="lg" gap="xs">
          <SectionHeader title="Preferences" />
          <Box gap="xs">
            <SettingsRow icon={Map} label="Map View" onPress={() => {}} />
            <SettingsRow icon={Languages} label="Language" onPress={() => {}} />
            <SettingsRow icon={Timer} label="Time Zone" onPress={() => {}} />
          </Box>
        </Box>
      </ScrollView>

      <Dialog
        visible={logoutDialogVisible}
        onClose={() => setLogoutDialogVisible(false)}
        title="Log out"
        message="Are you sure you want to log out?"
        actions={[
          {
            label: "Cancel",
            style: "default",
            onPress: () => setLogoutDialogVisible(false),
          },
          {
            label: isPending ? "Logging out..." : "Log out",
            style: "destructive",
            onPress: async () => {
              setLogoutDialogVisible(false);
              await logout();
            },
          },
        ]}
      />

      <Dialog
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
        title="Delete account"
        message="This will permanently delete your account and all data. This cannot be undone."
        actions={[
          {
            label: "Cancel",
            style: "default",
            onPress: () => setDeleteDialogVisible(false),
          },
          {
            label: isDeleting ? "Deleting..." : "Delete",
            style: "destructive",
            onPress: () => {
              setDeleteDialogVisible(false);
              handleDeleteAccount();
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 120;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: CornerRadius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
    backgroundColor: ColorPalette.white,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xxl,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 0,
    backgroundColor: ColorPalette.white,
    borderRadius: 10,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 52,
  },
});
