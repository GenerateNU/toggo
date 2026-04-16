import {
  useDeleteActivity,
  useGetActivity,
  useUpdateActivity,
} from "@/api/activities";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useGetImage } from "@/api/files/custom/useGetImage";
import { getPlaceDetailsCustom } from "@/api/places/custom";
import { useUser } from "@/contexts/user";
import { Box, Text } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import { locationSelectStore } from "@/utilities/locationSelectStore";
import { router, useLocalSearchParams } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { EntityDetailScreen } from "../../components/entity-detail-screen";

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

export default function HousingDetail() {
  const {
    id: housingID,
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
    data: housing,
    isLoading,
    refetch,
  } = useGetActivity(tripID ?? "", housingID, {
    query: { enabled: !!(tripID && housingID) },
  });

  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();

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
    entityID: housingID ?? "",
    enabled: !!(tripID && housingID),
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
    if (!housing) return;
    setName(housing.name ?? "");
    setDescription(housing.description ?? "");
    setPrice(housing.estimated_price ?? null);
    setDateRange(parseActivityDates(housing));
    setLocationName(housing.location_name ?? null);
    setLocationLat(housing.location_lat ?? null);
    setLocationLng(housing.location_lng ?? null);
    setLink(housing.media_url ?? "");
  }, [housing]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const heroImages = useMemo(() => {
    const images: string[] = [];
    if (housing?.thumbnail_url) images.push(housing.thumbnail_url);
    housing?.image_ids?.forEach((img) => {
      if (img.image_url && img.image_url !== housing.thumbnail_url)
        images.push(img.image_url);
    });
    return images;
  }, [housing]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const saveField = useCallback(
    async (patch: Parameters<typeof updateMutation.mutateAsync>[0]["data"]) => {
      if (!tripID || !housingID) return;
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          tripID,
          activityID: housingID,
          data: patch,
        });
        refetch();
      } catch {
        // toast handled by caller if needed
      } finally {
        setIsSaving(false);
      }
    },
    [tripID, housingID, updateMutation, refetch],
  );

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
    if (!tripID || !housingID) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ tripID, activityID: housingID });
      router.replace(`/trips/${tripID}` as any);
    } catch {
      setIsDeleting(false);
    }
  }, [tripID, housingID, deleteMutation]);

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

  if (!housing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={[]}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text variant="bodyDefault" color="gray500">
            Housing option not found.
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
      entityID={housingID ?? ""}
      allMediaPath={`/trips/${tripID}/housing/${housingID}/housing-all-media`}
      menuActions={[
        {
          label: "Delete housing option",
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
      // No actionButton or extraSection for housing
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
