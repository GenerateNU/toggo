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
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
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
import { locationSelectStore } from "@/utilities/locationSelectStore";
import { formatTripDates } from "@/utils/date-helpers";

import type { ModelsPlacePrediction } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, LogOut, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";

type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

function SettingsRow({
  label,
  value,
  onPress,
  isFirst,
  isLast,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="sm"
        paddingTop={isFirst ? "sm" : "xs"}
        paddingBottom={isLast ? "sm" : "xs"}
        backgroundColor="gray25"
        gap="xs"
      >
        <Box flex={1} gap="xxs">
          <Text variant="bodySmMedium" color="gray400">
            {label}
          </Text>
          <Text variant="bodyMedium" color="gray600">
            {value ?? "—"}
          </Text>
        </Box>
        {onPress && <Icon icon={ArrowRight} size="iconSm" color="black" />}
      </Box>
    </Pressable>
  );
}

type NotificationRowProps = {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
};

function NotificationRow({
  label,
  value,
  onChange,
  isFirst,
  isLast,
}: NotificationRowProps) {
  return (
    <Box
      paddingHorizontal="sm"
      paddingTop={isFirst ? "xs" : "xxs"}
      paddingBottom={isLast ? "xs" : "xxs"}
      backgroundColor="gray25"
    >
      <Toggle label={label} value={value} onChange={onChange} />
    </Box>
  );
}

function SettingsDivider() {
  return (
    <Box paddingVertical="xs" paddingHorizontal="sm" backgroundColor="gray25">
      <Divider
        width={1}
        color={ColorPalette.gray50}
        style={{ marginVertical: 0 }}
      />
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
  const tripDates = formatTripDates(trip?.start_date, trip?.end_date);
  const tripLocation = (trip as any)?.location as string | undefined;

  useEffect(() => {
    return () => {
      locationSelectStore.clear();
    };
  }, []);

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

  const handleDestinationPress = () => {
    if (!tripID) return;

    locationSelectStore.set(
      async (prediction: ModelsPlacePrediction) => {
        const destination =
          prediction.description ?? prediction.main_text ?? "";

        if (!destination) return;

        try {
          await updateTripMutation.mutateAsync({
            tripID,
            data: {
              location: destination,
            } as any,
          });
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getTripQueryKey(tripID),
            }),
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY }),
            queryClient.invalidateQueries({
              queryKey: getAllTripsQueryKey({}),
            }),
          ]);
          toast.show({ message: "Destination updated." });
        } catch {
          toast.show({
            message: "Couldn't update destination. Please try again.",
          });
        }
      },
      () => {
        locationSelectStore.clear();
      },
    );

    router.push(`/trips/${tripID}/search-location?mode=select` as any);
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
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getAllTripsQueryKey({}),
        }),
        queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripID) }),
      ]);
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
            placeholder=""
            showPlaceholderText={false}
            disabled={isCoverUploading || isLoadingTrip}
            title="Change cover photo"
            showRemoveAction={false}
          />
        </Box>

        <Box gap="lg" paddingHorizontal="md">
          <Box gap="xs" paddingTop="sm">
            <Text variant="headingMd" color="gray900">
              General
            </Text>
            <Box backgroundColor="gray25" borderRadius="xl" overflow="hidden">
              <SettingsRow
                label="Trip Name"
                value={isLoadingTrip ? "Loading..." : trip?.name}
                isFirst
                onPress={() =>
                  router.push(`/trips/${tripID}/settings/edit-name` as any)
                }
              />
              <SettingsDivider />
              <SettingsRow
                label="Destination"
                value={isLoadingTrip ? "Loading..." : tripLocation}
                onPress={handleDestinationPress}
              />
              <SettingsDivider />
              <SettingsRow
                label="Dates"
                value={isLoadingTrip ? "Loading..." : (tripDates ?? undefined)}
                isLast={false}
                onPress={() =>
                  router.push(`/trips/${tripID}/settings/edit-dates` as any)
                }
              />
              <SettingsDivider />
              <Pressable
                onPress={() =>
                  router.push(`/trips/${tripID}/settings/members` as any)
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  paddingHorizontal="sm"
                  paddingTop="xs"
                  paddingBottom="sm"
                  backgroundColor="gray25"
                  gap="sm"
                >
                  <Box flex={1} gap="xxs">
                    <Text variant="bodySmMedium" color="gray400">
                      Members
                    </Text>
                    <AvatarStack
                      members={members.map((m) => ({
                        userId: m.user_id ?? "",
                        profilePhotoUrl: m.profile_picture_url,
                        name: m.name,
                      }))}
                    />
                  </Box>
                  <Icon icon={ArrowRight} size="iconSm" color="black" />
                </Box>
              </Pressable>
            </Box>
          </Box>

          <Box gap="xs">
            <Text variant="headingMd" color="gray900">
              Notifications
            </Text>
            <Box backgroundColor="gray25" borderRadius="xl" overflow="hidden">
              <NotificationRow
                label="New Pitches"
                value={myMembership?.notify_new_pitches ?? true}
                isFirst
                onChange={(v) => handleNotifChange("notify_new_pitches", v)}
              />
              <SettingsDivider />
              <NotificationRow
                label="New Polls"
                value={myMembership?.notify_new_polls ?? true}
                onChange={(v) => handleNotifChange("notify_new_polls", v)}
              />
              <SettingsDivider />
              <NotificationRow
                label="Comments"
                value={myMembership?.notify_new_comments ?? true}
                isLast
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
