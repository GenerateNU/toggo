import { useUploadImage } from "@/api/files/custom/useImageUpload";
import {
  getMembershipQueryKey,
  useGetMembership,
} from "@/api/memberships/useGetMembership";
import { useGetTripMembers } from "@/api/memberships/useGetTripMembers";
import { useRemoveMember } from "@/api/memberships/useRemoveMember";
import { useUpdateNotificationPreferences } from "@/api/memberships/useUpdateNotificationPreferences";
import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { useDeleteTrip } from "@/api/trips/useDeleteTrip";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { useUser } from "@/contexts/user";
import {
  AvatarStack,
  Box,
  Button,
  Dialog,
  Divider,
  Icon,
  ImagePicker,
  Text,
  Toggle,
  useToast,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";

import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, LogOut, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView } from "react-native";

type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
};

function SettingsRow({ label, value, onPress }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="md"
        paddingVertical="xs"
        backgroundColor="gray25"
        gap="xs"
      >
        <Box flex={1} gap="xxs">
          <Text variant="bodySmDefault" color="gray500">
            {label}
          </Text>
          <Text variant="bodySmDefault" color={value ? "gray900" : "gray500"}>
            {value ?? "—"}
          </Text>
        </Box>
        {onPress && <Icon icon={ChevronRight} size="xs" color="gray500" />}
      </Box>
    </Pressable>
  );
}

type NotificationRowProps = {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

function NotificationRow({ label, value, onChange }: NotificationRowProps) {
  return (
    <Box paddingHorizontal="md" backgroundColor="gray25">
      <Toggle label={label} value={value} onChange={onChange} />
    </Box>
  );
}

export default function TripSettings() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useUser();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: trip, isLoading: isLoadingTrip } = useGetTrip(tripID!);
  const { data: membersData, isLoading: isLoadingMembers } = useGetTripMembers(
    tripID!,
  );
  const { data: myMembership } = useGetMembership(
    tripID!,
    currentUser?.id ?? "",
  );

  const [leaveDialog, setLeaveDialog] = useState<
    "confirm" | "assign-admin" | null
  >(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const removeMemberMutation = useRemoveMember();
  const deleteTripMutation = useDeleteTrip();
  const updateTripMutation = useUpdateTrip();
  const uploadImageMutation = useUploadImage();
  const updateNotifPrefsMutation = useUpdateNotificationPreferences();

  const members = membersData?.items ?? [];
  const isAdmin = myMembership?.is_admin ?? false;
  const otherAdmins = members.filter(
    (m) => m.is_admin && m.user_id !== currentUser?.id,
  );

  const isCoverUploading =
    uploadImageMutation.isPending || updateTripMutation.isPending;

  const handleNotifChange = (
    field: "notify_new_pitches" | "notify_new_polls" | "notify_new_comments",
    value: boolean,
  ) => {
    if (!tripID || !currentUser) return;

    const queryKey = getMembershipQueryKey(tripID, currentUser.id);
    queryClient.setQueryData(queryKey, (prev: typeof myMembership) =>
      prev ? { ...prev, [field]: value } : prev,
    );

    updateNotifPrefsMutation.mutate(
      { tripID, userID: currentUser.id, data: { [field]: value } },
      {
        onError: () => {
          queryClient.invalidateQueries({ queryKey });
          toast.show({
            message:
              "Couldn't update notification preference. Please try again.",
          });
        },
      },
    );
  };

  const handleCoverImageChange = async (uri: string | null) => {
    if (!uri) return;
    try {
      const { imageId } = await uploadImageMutation.mutateAsync({
        uri,
        sizes: ["large", "medium"],
      });
      await updateTripMutation.mutateAsync({
        tripID: tripID!,
        data: {
          name: trip?.name,
          budget_min: trip?.budget_min,
          budget_max: trip?.budget_max,
          currency: trip?.currency,
          cover_image_id: imageId,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripID!) }),
        queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY }),
      ]);
      toast.show({ message: "Cover image updated." });
    } catch {
      toast.show({ message: "Couldn't update cover image. Please try again." });
    }
  };

  const handleLeaveTrip = () => {
    if (isAdmin && otherAdmins.length === 0 && members.length > 1) {
      setLeaveDialog("assign-admin");
    } else {
      setLeaveDialog("confirm");
    }
  };

  const confirmLeaveTrip = async () => {
    if (!tripID || !currentUser) return;
    setLeaveDialog(null);
    try {
      await removeMemberMutation.mutateAsync({
        tripID,
        userID: currentUser.id,
      });
      router.replace("/");
    } catch {
      toast.show({ message: "Couldn't leave the trip. Please try again." });
    }
  };

  const handleDeleteTrip = () => {
    setDeleteDialog(true);
  };

  const confirmDeleteTrip = async () => {
    if (!tripID) return;
    setDeleteDialog(false);
    try {
      await deleteTripMutation.mutateAsync({ tripID });
      router.replace("/");
    } catch {
      toast.show({ message: "Couldn't delete the trip. Please try again." });
    }
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: ColorPalette.white }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Box padding="sm">
          <ImagePicker
            variant="rectangular"
            width="100%"
            height={200}
            value={trip?.cover_image_url}
            onChange={handleCoverImageChange}
            placeholder={isCoverUploading ? "Uploading..." : "Add cover image"}
            disabled={isCoverUploading || isLoadingTrip}
          />
        </Box>

        <Box gap="lg" paddingHorizontal="md">
          <Box gap="xs">
            <Text variant="bodyMedium" color="gray900">
              General
            </Text>
            <Box
              paddingVertical="sm"
              backgroundColor="gray25"
              borderRadius="sm"
              overflow="hidden"
            >
              <SettingsRow
                label="Trip Name"
                value={isLoadingTrip ? "Loading..." : trip?.name}
                onPress={() =>
                  router.push(`/trips/${tripID}/settings/edit-name` as any)
                }
              />
              <Divider />
              <Pressable
                onPress={() =>
                  router.push(`/trips/${tripID}/settings/members` as any)
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  paddingHorizontal="md"
                  backgroundColor="gray25"
                  gap="sm"
                  paddingBottom="xs"
                >
                  <Box flex={1} gap="xxs">
                    <Text variant="bodySmDefault" color="gray500">
                      Members
                    </Text>
                    <AvatarStack
                      members={members.map((m) => ({
                        userId: m.user_id ?? "",
                        profilePhotoUrl: m.profile_picture_url,
                        username: m.username,
                      }))}
                    />
                  </Box>
                  <Icon icon={ChevronRight} size="xs" color="gray500" />
                </Box>
              </Pressable>
            </Box>
          </Box>

          <Box gap="xs">
            <Text variant="bodyMedium" color="gray900">
              Notifications
            </Text>
            <Box
              paddingVertical="sm"
              backgroundColor="gray25"
              borderRadius="sm"
              overflow="hidden"
            >
              <NotificationRow
                label="New Pitches"
                value={myMembership?.notify_new_pitches ?? true}
                onChange={(v) => handleNotifChange("notify_new_pitches", v)}
              />
              <Divider />
              <NotificationRow
                label="New Polls"
                value={myMembership?.notify_new_polls ?? true}
                onChange={(v) => handleNotifChange("notify_new_polls", v)}
              />
              <Divider />
              <NotificationRow
                label="Comments"
                value={myMembership?.notify_new_comments ?? true}
                onChange={(v) => handleNotifChange("notify_new_comments", v)}
              />
            </Box>
          </Box>

          <Box gap="sm">
            <Button
              layout="leadingIcon"
              leftIcon={LogOut}
              label="Leave Trip"
              variant="Secondary"
              onPress={handleLeaveTrip}
              disabled={
                isLoadingMembers ||
                removeMemberMutation.isPending ||
                deleteTripMutation.isPending
              }
            />
            {isAdmin && (
              <Button
                layout="leadingIcon"
                leftIcon={Trash2}
                label="Delete Trip"
                variant="Destructive"
                onPress={handleDeleteTrip}
                disabled={
                  removeMemberMutation.isPending || deleteTripMutation.isPending
                }
              />
            )}
          </Box>
        </Box>
      </ScrollView>

      <Dialog
        visible={leaveDialog === "confirm"}
        onClose={() => setLeaveDialog(null)}
        title="Leave Trip?"
        actions={[
          { label: "Cancel", onPress: () => setLeaveDialog(null) },
          {
            label: "Leave this trip",
            style: "destructive",
            onPress: confirmLeaveTrip,
          },
        ]}
      />

      <Dialog
        visible={leaveDialog === "assign-admin"}
        onClose={() => setLeaveDialog(null)}
        title="Leave this trip"
        message="You must make another member an admin before leaving the trip."
        actions={[
          { label: "Cancel", onPress: () => setLeaveDialog(null) },
          {
            label: "Go assign Admin",
            style: "navigate",
            onPress: () => {
              setLeaveDialog(null);
              router.push(`/trips/${tripID}/settings/members` as any);
            },
          },
        ]}
      />

      <Dialog
        visible={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        title="Delete Trip?"
        message="This cannot be undone."
        actions={[
          { label: "Cancel", onPress: () => setDeleteDialog(false) },
          {
            label: "Delete this trip",
            style: "destructive",
            onPress: confirmDeleteTrip,
          },
        ]}
      />
    </>
  );
}
