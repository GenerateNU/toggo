import { useDeleteUser } from "@/api";
import { useGetImage } from "@/api/files/custom/useGetImage";
import { useUploadProfilePicture } from "@/api/files/custom/useUploadProfilePicture";
import { useUpdateUser } from "@/api/users/useUpdateUser";
import { DeleteAccountSheet } from "@/app/(app)/components/delete-account-sheet";
import { LogoutSheet } from "@/app/(app)/components/logout-sheet";
import { useUser } from "@/contexts/user";
import { Box, Icon, ImagePicker, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { router } from "expo-router";
import {
  ArrowRight,
  Bell,
  LogOut,
  Map,
  PenLine,
  Timer,
  Trash2,
  User,
} from "lucide-react-native";
import { useRef } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsRowProps = {
  icon: React.ComponentType<any>;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  subtitle?: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsRow({
  icon: IconComponent,
  label,
  onPress,
  destructive = false,
  subtitle,
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
          <Box gap="xxs">
            <Text variant="bodyMedium" color={textColor}>
              {label}
            </Text>
            {subtitle ? (
              <Text variant="bodyXsDefault" color="gray500">
                {subtitle}
              </Text>
            ) : null}
          </Box>
        </Box>
        <Icon icon={ArrowRight} size="sm" color="gray500" />
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

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 120;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { currentUser, logout, refreshCurrentUser } = useUser();
  const { data: profileImageData } = useGetImage(
    [currentUser?.profile_picture],
    "small",
  );
  const profilePhotoUrl = profileImageData[0]?.url;

  const { mutateAsync: uploadPhoto, isPending: isUploading } =
    useUploadProfilePicture();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutate: deleteUser } = useDeleteUser();

  const logoutSheetRef = useRef<any>(null);
  const deleteSheetRef = useRef<any>(null);

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
      // non-blocking
    }
  };

  const handleLogoutConfirm = async () => {
    logoutSheetRef.current?.close();
    await logout();
  };

  const handleDeleteConfirm = () => {
    deleteSheetRef.current?.close();
    if (currentUser?.id) {
      deleteUser({ userID: currentUser.id });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Box alignItems="center" gap="sm">
          <View style={styles.avatarContainer}>
            <ImagePicker
              variant="circular"
              size={AVATAR_SIZE}
              value={profilePhotoUrl ?? undefined}
              onChange={handlePhotoChange}
              disabled={isUploading}
              title="Edit profile picture"
              subtitle="Customize your profile picture with images"
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
              onPress={() => logoutSheetRef.current?.snapToIndex(0)}
            />
            <SettingsRow
              icon={Trash2}
              label="Delete Account"
              onPress={() => deleteSheetRef.current?.snapToIndex(0)}
              destructive
            />
          </Box>
        </Box>

        {/* Preferences section */}
        <Box paddingHorizontal="sm" paddingTop="lg" gap="xs">
          <SectionHeader title="Preferences" />
          <Box gap="xs">
            <SettingsRow icon={Map} label="Map View" onPress={() => {}} />
            <SettingsRow
              icon={Timer}
              label="Time Zone"
              subtitle={currentUser?.timezone ?? undefined}
              onPress={() => router.push("/settings/timezone" as any)}
            />
          </Box>
        </Box>
      </ScrollView>

      <LogoutSheet
        bottomSheetRef={logoutSheetRef}
        onConfirm={handleLogoutConfirm}
      />

      <DeleteAccountSheet
        bottomSheetRef={deleteSheetRef}
        onConfirm={handleDeleteConfirm}
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
    paddingTop: Layout.spacing.md,
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
