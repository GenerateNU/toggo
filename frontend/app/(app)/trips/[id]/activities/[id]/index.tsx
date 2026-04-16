import {
  useDeleteActivity,
  useGetActivity,
  useUpdateActivity,
} from "@/api/activities";
import { usePostApiV1TripsTripidActivitiesActivityidRsvp } from "@/api/activities/usePostApiV1TripsTripidActivitiesActivityidRsvp";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useGetImage } from "@/api/files/custom/useGetImage";
import { getPlaceDetailsCustom } from "@/api/places/custom";
import { useUser } from "@/contexts/user";
import { Box, Text } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { modelsEntityType, modelsRSVPStatus } from "@/types/types.gen";
import { locationSelectStore } from "@/utilities/locationSelectStore";
import { router, useLocalSearchParams } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { EntityDetailScreen } from "../../components/entity-detail-screen";
import { MembersGoingSection } from "../../components/members-going-section";
import { RsvpButton } from "../components/rsvp-button";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseActivityDates(activity: ModelsActivityAPIResponse): DateRange {
  const first = activity.dates?.[0];
  if (!first?.start) return { start: null, end: null };
  return {
    start: new Date(first.start),
    end: first.end ? new Date(first.end) : new Date(first.start),
  };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ActivityDetail() {
  const {
    id: activityID,
    tripID,
    openComments,
  } = useLocalSearchParams<{
    id: string;
    tripID: string;
    openComments?: string;
  }>();
  const { currentUser, userId } = useUser();

  const { data: currentUserProfileImages } = useGetImage(
    [currentUser?.profile_picture],
    "small",
  );
  const currentUserProfilePhotoUrl = currentUserProfileImages?.[0]?.url;

  // ─── Remote data ─────────────────────────────────────────────────────────

  const {
    data: activity,
    isLoading,
    refetch,
  } = useGetActivity(tripID ?? "", activityID, {
    query: { enabled: !!(tripID && activityID) },
  });

  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();
  const rsvpMutation = usePostApiV1TripsTripidActivitiesActivityidRsvp();

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID: tripID ?? "",
    entityType: modelsEntityType.ActivityEntity,
    entityID: activityID ?? "",
    enabled: !!(tripID && activityID),
  });

  // ─── Local state ─────────────────────────────────────────────────────────

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!activity) return;
    setName(activity.name ?? "");
    setDescription(activity.description ?? "");
    setPrice(activity.estimated_price ?? null);
    setDateRange(parseActivityDates(activity));
    setLocationName(activity.location_name ?? null);
    setLocationLat(activity.location_lat ?? null);
    setLocationLng(activity.location_lng ?? null);
    setLink(activity.media_url ?? "");
  }, [activity]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const heroImages = useMemo(() => {
    const images: string[] = [];
    if (activity?.thumbnail_url) images.push(activity.thumbnail_url);
    activity?.image_ids?.forEach((img) => {
      if (img.image_url && img.image_url !== activity.thumbnail_url)
        images.push(img.image_url);
    });
    return images;
  }, [activity]);

  const isGoing = useMemo(() => {
    if (!userId || !activity?.going_users) return false;
    return activity.going_users.some((u) => u.user_id === userId);
  }, [userId, activity]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const saveField = useCallback(
    async (patch: Parameters<typeof updateMutation.mutateAsync>[0]["data"]) => {
      if (!tripID || !activityID) return;
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({ tripID, activityID, data: patch });
        refetch();
      } catch {
        // no-op — callers show their own toasts if needed
      } finally {
        setIsSaving(false);
      }
    },
    [tripID, activityID, updateMutation, refetch],
  );

  const handleRsvp = useCallback(async () => {
    if (!tripID || !activityID) return;
    try {
      await rsvpMutation.mutateAsync({
        tripID,
        activityID,
        data: {
          status: isGoing
            ? modelsRSVPStatus.RSVPStatusNotGoing
            : modelsRSVPStatus.RSVPStatusGoing,
        },
      });
    } catch {
      // no-op
      return;
    }
    refetch();
  }, [tripID, activityID, isGoing, rsvpMutation, refetch]);

  const handleEditLocation = useCallback(() => {
    locationSelectStore.set(async (prediction) => {
      try {
        const res = await getPlaceDetailsCustom({
          place_id: prediction.place_id,
        });
        const newName =
          res.data.formatted_address || prediction.description || res.data.name;
        setLocationName(newName);
        setLocationLat(res.data.geometry.location.lat);
        setLocationLng(res.data.geometry.location.lng);
        await saveField({
          location_name: newName,
          location_lat: res.data.geometry.location.lat,
          location_lng: res.data.geometry.location.lng,
        });
      } catch {
        setLocationName(prediction.description ?? null);
      }
    });
    router.push(`/trips/${tripID}/search-location?mode=select`);
  }, [tripID, saveField]);

  const handleDelete = useCallback(async () => {
    if (!tripID || !activityID) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ tripID, activityID });
      router.replace(`/trips/${tripID}` as any);
    } catch {
      setIsDeleting(false);
    }
  }, [tripID, activityID, deleteMutation]);

  const handleRemoveMember = useCallback((_memberId: string) => {
    // coming soon
  }, []);

  // ─── Loading / not found ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text variant="bodyDefault" color="gray500">
            Loading...
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text variant="bodyDefault" color="gray500">
            Activity not found.
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <EntityDetailScreen
      name={name}
      description={description}
      heroImages={heroImages}
      price={price}
      dateRange={dateRange}
      locationName={locationName}
      locationLat={locationLat}
      locationLng={locationLng}
      link={link}
      tripID={tripID ?? ""}
      entityID={activityID ?? ""}
      allMediaPath={`/trips/${tripID}/activities/${activityID}/activity-all-media`}
      menuActions={[
        {
          label: "Delete activity",
          icon: Trash2,
          isDanger: true,
          onPress: () => setIsDeleteVisible(true),
        },
      ]}
      onBack={() => router.back()}
      onSavePrice={async (p) => {
        setPrice(p);
        await saveField({ estimated_price: p });
      }}
      onSaveDateRange={async (range) => {
        if (range.start && range.end) {
          await saveField({
            dates: [
              {
                start: range.start.toISOString().split("T")[0]!,
                end: range.end.toISOString().split("T")[0]!,
              },
            ],
          });
        }
      }}
      onEditLocation={handleEditLocation}
      onSaveLink={async (l) => {
        await saveField({ media_url: l || undefined });
      }}
      onPriceChange={setPrice}
      onDateRangeChange={setDateRange}
      onLocationChange={(n, lat, lng) => {
        setLocationName(n);
        setLocationLat(lat);
        setLocationLng(lng);
      }}
      onLinkChange={setLink}
      actionButton={
        <RsvpButton
          isGoing={isGoing}
          onPress={handleRsvp}
          disabled={rsvpMutation.isPending}
          variant="detail"
        />
      }
      extraSection={
        <MembersGoingSection
          goingUsers={activity.going_users ?? []}
          onRemoveMember={handleRemoveMember}
        />
      }
      comments={comments}
      isLoadingComments={isLoadingComments}
      isLoadingMoreComments={isLoadingMoreComments}
      onLoadMoreComments={fetchNextPage}
      onSubmitComment={onSubmitComment}
      onReact={onReact}
      currentUserId={userId ?? ""}
      currentUserName={currentUser?.name ?? ""}
      currentUserAvatar={currentUserProfilePhotoUrl}
      currentUserSeed={currentUser?.id}
      openComments={openComments === "true"}
      isDeleteVisible={isDeleteVisible}
      isDeleting={isDeleting}
      deleteTitle={`Delete "${name}"`}
      deleteSubtitle={`Deleting "${name}" will permanently remove it from your trip.`}
      deleteConfirmLabel={`Delete "${name}"`}
      deleteCancelLabel={`Keep "${name}"`}
      onDeleteConfirm={handleDelete}
      onDeleteCancel={() => setIsDeleteVisible(false)}
    />
  );
}
