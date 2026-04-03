import { useUploadImage } from "@/api/files/custom/useImageUpload";
import { useGetMembership } from "@/api/memberships/useGetMembership";
import { useGetTripMembers } from "@/api/memberships/useGetTripMembers";
import { useRemoveMember } from "@/api/memberships/useRemoveMember";
import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { useDeleteTrip } from "@/api/trips/useDeleteTrip";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { useUser } from "@/contexts/user";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Icon,
  ImagePicker,
  Text,
  Toggle,
  useToast,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import type { ModelsMembershipAPIResponse } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, LogOut, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView } from "react-native";

function formatMemberSummary(members: ModelsMembershipAPIResponse[]): string {
  const names = members.map((m) => m.username).filter(Boolean) as string[];
  if (names.length === 0) return "No members";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]}, and ${rest} other${rest === 1 ? "" : "s"}`;
}

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

  const [notifPitches, setNotifPitches] = useState(false);
  const [notifPolls, setNotifPolls] = useState(true);
  const [notifComments, setNotifComments] = useState(true);

  const { data: trip, isLoading: isLoadingTrip } = useGetTrip(tripID!);
  const { data: membersData } = useGetTripMembers(tripID!);
  const { data: myMembership } = useGetMembership(tripID!, currentUser?.id ?? "");

  const removeMemberMutation = useRemoveMember();
  const deleteTripMutation = useDeleteTrip();
  const updateTripMutation = useUpdateTrip();
  const uploadImageMutation = useUploadImage();

  const members = membersData?.items ?? [];
  const isAdmin = myMembership?.is_admin ?? false;
  const otherAdmins = members.filter(
    (m) => m.is_admin && m.user_id !== currentUser?.id,
  );

  const isCoverUploading = uploadImageMutation.isPending || updateTripMutation.isPending;

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
      Alert.alert(
        "Leave this Trip",
        "You must make another member an admin before leaving the trip.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go assign Admin",
            onPress: () =>
              router.push(`/trips/${tripID}/settings/members` as any),
          },
        ],
      );
      return;
    }

    Alert.alert("Leave Trip?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave this Trip",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMemberMutation.mutateAsync({
              tripID: tripID!,
              userID: currentUser!.id,
            });
            router.replace("/");
          } catch {
            toast.show({ message: "Couldn't leave the trip. Please try again." });
          }
        },
      },
    ]);
  };

  const handleDeleteTrip = () => {
    Alert.alert("Delete Trip?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete this Trip",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTripMutation.mutateAsync({ tripID: tripID! });
            router.replace("/");
          } catch {
            toast.show({ message: "Couldn't delete the trip. Please try again." });
          }
        },
      },
    ]);
  };

  return (
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
          <Box paddingVertical="xs" backgroundColor="gray25" borderRadius="sm" overflow="hidden">
            <SettingsRow
              label="Trip Name"
              value={isLoadingTrip ? "Loading..." : trip?.name}
              onPress={() => router.push(`/trips/${tripID}/settings/edit-name` as any)}
            />
            <Divider />
            <Pressable
              onPress={() => router.push(`/trips/${tripID}/settings/members` as any)}
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
                  <Box flexDirection="row" alignItems="center" gap="xs">
                    <Box flexDirection="row">
                      {members.slice(0, 3).map((m, i) => (
                        <Box
                          key={m.user_id}
                          borderRadius="full"
                          borderWidth={2}
                          borderColor="gray25"
                          style={{ marginLeft: i === 0 ? 0 : -6 }}
                        >
                          <Avatar
                            profilePhoto={m.profile_picture_url}
                            seed={m.user_id}
                            variant="xs"
                          />
                        </Box>
                      ))}
                      {members.length > 3 && (
                        <Box
                          width={16}
                          height={16}
                          borderRadius="full"
                          backgroundColor="gray200"
                          borderWidth={2}
                          borderColor="gray25"
                          justifyContent="center"
                          alignItems="center"
                          style={{ marginLeft: -6 }}
                        >
                          <Text variant="bodyXsDefault" color="gray500">
                            +{members.length - 3}
                          </Text>
                        </Box>
                      )}
                    </Box>
                    <Text variant="bodySmDefault" color="gray900">
                      {formatMemberSummary(members)}
                    </Text>
                  </Box>
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
          <Box paddingVertical="sm" backgroundColor="gray25" borderRadius="sm" overflow="hidden">
            <NotificationRow
              label="New Pitches"
              value={notifPitches}
              onChange={setNotifPitches}
            />
            <Divider />
            <NotificationRow
              label="New Polls"
              value={notifPolls}
              onChange={setNotifPolls}
            />
            <Divider />
            <NotificationRow
              label="Comments & Replies"
              value={notifComments}
              onChange={setNotifComments}
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
            disabled={removeMemberMutation.isPending || deleteTripMutation.isPending}
          />
          {isAdmin && (
            <Button
              layout="leadingIcon"
              leftIcon={Trash2}
              label="Delete Trip"
              variant="Destructive"
              onPress={handleDeleteTrip}
              disabled={removeMemberMutation.isPending || deleteTripMutation.isPending}
            />
          )}
        </Box>
      </Box>
    </ScrollView>

  );
}
