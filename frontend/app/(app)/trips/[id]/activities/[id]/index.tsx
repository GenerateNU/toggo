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
import {
  BottomSheet,
  Box,
  DateRangePicker,
  Text,
  useToast,
} from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { PricePicker } from "@/design-system/primitives/price-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { modelsEntityType, modelsRSVPStatus } from "@/types/types.gen";
import { locationSelectStore } from "@/utilities/locationSelectStore";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, DollarSign, MapPin, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Shared components ────────────────────────────────────────────────────────
import { ConfirmSheet } from "@/app/(app)/components/confirm-sheet";
import { DetailHeader } from "../../components/detail-header";
import { HeroCarousel } from "../../components/hero-carousel";
import { LinkPill } from "../../components/link-pill";
import { MembersGoingSection } from "../../components/members-going-section";
import { Divider, SectionHeader } from "../../components/section-header";
import { RsvpButton } from "../components/rsvp-button";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(range: DateRange): string | null {
  if (!range.start) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!range.end || range.start.getTime() === range.end.getTime())
    return fmt(range.start);
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

function parseActivityDates(activity: ModelsActivityAPIResponse): DateRange {
  const first = activity.dates?.[0];
  if (!first?.start) return { start: null, end: null };
  return {
    start: new Date(first.start),
    end: first.end ? new Date(first.end) : new Date(first.start),
  };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
  const toast = useToast();
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

  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();
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

  // ─── Editable local state ─────────────────────────────────────────────────

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

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [isPricePickerVisible, setIsPricePickerVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isDeleteSheetVisible, setIsDeleteSheetVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(
    openComments === "true",
  );
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const linkEditSheetRef = useRef<BottomSheetMethods>(null);

  useEffect(() => {
    if (isEditingLink) {
      linkEditSheetRef.current?.snapToIndex(0);
    } else {
      linkEditSheetRef.current?.close();
    }
  }, [isEditingLink]);

  // ─── Derived ──────────────────────────────────────────────────────────────

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

  const coordinate: [number, number] | null =
    locationLat != null && locationLng != null
      ? [locationLng, locationLat]
      : null;

  const formattedDate = formatDateRange(dateRange);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const saveField = useCallback(
    async (
      patch: Parameters<typeof updateActivityMutation.mutateAsync>[0]["data"],
    ) => {
      if (!tripID || !activityID) return;
      setIsSaving(true);
      try {
        await updateActivityMutation.mutateAsync({
          tripID,
          activityID,
          data: patch,
        });
        refetch();
      } catch {
        toast.show({ message: "Couldn't save changes. Try again." });
      } finally {
        setIsSaving(false);
      }
    },
    [tripID, activityID, updateActivityMutation, refetch, toast],
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
      toast.show({ message: "Couldn't update RSVP. Try again." });
      return;
    }
    refetch();
  }, [tripID, activityID, isGoing, rsvpMutation, refetch, toast]);

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
      await deleteActivityMutation.mutateAsync({ tripID, activityID });
      router.replace(`/trips/${tripID}` as any);
    } catch {
      setIsDeleting(false);
      toast.show({ message: "Couldn't delete activity. Try again." });
    }
  }, [tripID, activityID, deleteActivityMutation, toast]);

  const handleRemoveMember = useCallback(
    (_memberId: string) => {
      toast.show({ message: "Remove member coming soon." });
    },
    [toast],
  );

  // ─── Loading / not found ──────────────────────────────────────────────────

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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      edges={["bottom"]}
    >
      <DetailHeader
        title={name}
        onBack={() => router.back()}
        menuActions={[
          {
            label: "Delete activity",
            icon: Trash2,
            isDanger: true,
            onPress: () => setIsDeleteSheetVisible(true),
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroCarousel
          images={heroImages}
          onViewAll={() =>
            router.push({
              pathname:
                `/trips/${tripID}/activities/${activityID}/all-media` as any,
              params: { tripID, activityID },
            })
          }
        />

        <Box style={styles.body}>
          {/* Title + RSVP */}
          <Box style={styles.titleGroup}>
            <Box style={styles.titleRow}>
              <Text style={styles.activityTitle} numberOfLines={2}>
                {name}
              </Text>
              <RsvpButton
                isGoing={isGoing}
                onPress={handleRsvp}
                disabled={rsvpMutation.isPending}
                variant="detail"
              />
            </Box>

            {!!description && (
              <Text style={styles.description}>{description}</Text>
            )}

            {!!locationName && (
              <Box style={styles.locationChip}>
                <MapPin size={14} color={ColorPalette.gray950} />
                <Text variant="bodyDefault" color="gray950" numberOfLines={1}>
                  {locationName}
                </Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Price & Dates */}
          <Box style={styles.section}>
            <SectionHeader label="Price & Dates" />
            <Box style={styles.priceRow}>
              <DollarSign size={16} color={ColorPalette.gray950} />
              <Text style={styles.priceText}>
                {price != null ? `${price} USD` : "No price set"}
              </Text>
              <Pressable
                onPress={() => setIsPricePickerVisible(true)}
                hitSlop={8}
              >
                <Text style={styles.editButton}>Edit</Text>
              </Pressable>
            </Box>
            {formattedDate ? (
              <Box style={styles.priceRow}>
                <Calendar size={16} color={ColorPalette.gray950} />
                <Text style={styles.priceText}>{formattedDate}</Text>
                <Pressable
                  onPress={() => setIsDatePickerVisible(true)}
                  hitSlop={8}
                >
                  <Text style={styles.editButton}>Edit</Text>
                </Pressable>
              </Box>
            ) : (
              <Pressable
                style={styles.priceRow}
                onPress={() => setIsDatePickerVisible(true)}
              >
                <Calendar size={16} color={ColorPalette.blue500} />
                <Text style={styles.addText}>Add date</Text>
              </Pressable>
            )}
          </Box>

          <Divider />

          {/* Location */}
          <Box style={styles.section}>
            <SectionHeader label="Location" onEdit={handleEditLocation} />
            {locationName && (
              <Box style={styles.locationRow}>
                <MapPin size={14} color={ColorPalette.gray950} />
                <Text variant="bodyMedium" color="gray950">
                  {locationName}
                </Text>
              </Box>
            )}
            {coordinate && (
              <Box style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  mapStyle={MAP_STYLE_URL}
                  logoEnabled={false}
                  attributionEnabled={false}
                >
                  <Camera centerCoordinate={coordinate} zoomLevel={11} />
                  <PointAnnotation id="activity-pin" coordinate={coordinate}>
                    <View style={styles.pin}>
                      <View style={styles.pinDot} />
                    </View>
                  </PointAnnotation>
                </MapView>
              </Box>
            )}
            {!locationName && (
              <Pressable onPress={handleEditLocation}>
                <Text style={styles.addText}>Add location</Text>
              </Pressable>
            )}
          </Box>

          <Divider />

          {/* Link */}
          <Box style={styles.section}>
            <SectionHeader
              label="Link"
              onEdit={() => {
                setLinkDraft(link);
                setIsEditingLink(true);
              }}
            />
            {link ? (
              <LinkPill
                url={link}
                onEdit={() => {
                  setLinkDraft(link);
                  setIsEditingLink(true);
                }}
              />
            ) : (
              <Pressable
                onPress={() => {
                  setLinkDraft("");
                  setIsEditingLink(true);
                }}
              >
                <Text style={styles.addText}>Add link</Text>
              </Pressable>
            )}
          </Box>

          <Divider />

          <MembersGoingSection
            goingUsers={activity.going_users ?? []}
            onRemoveMember={handleRemoveMember}
          />

          <Box style={{ height: 90 }} />
        </Box>
      </ScrollView>

      {/* ─── Overlays ─────────────────────────────────────────────────── */}

      <PricePicker
        visible={isPricePickerVisible}
        value={price ?? undefined}
        onConfirm={async (p) => {
          setPrice(p);
          await saveField({ estimated_price: p });
        }}
        onClose={() => setIsPricePickerVisible(false)}
      />

      <DateRangePicker
        visible={isDatePickerVisible}
        initialRange={dateRange}
        onSave={async (range) => {
          setDateRange(range);
          setIsDatePickerVisible(false);
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
        onClose={() => setIsDatePickerVisible(false)}
      />

      <ConfirmSheet
        visible={isDeleteSheetVisible}
        title={`Delete "${name}"`}
        subtitle={`Deleting "${name}" will permanently remove it from your trip.`}
        confirmLabel={`Delete "${name}"`}
        cancelLabel={`Keep "${name}"`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteSheetVisible(false)}
      />

      <BottomSheet
        ref={linkEditSheetRef}
        snapPoints={[230]}
        initialIndex={-1}
        onChange={(index) => {
          if (index < 0) setIsEditingLink(false);
        }}
      >
        <Box style={styles.linkEditSheet}>
          <Text style={styles.linkEditTitle}>Edit link</Text>
          <TextInput
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder="https://"
            placeholderTextColor={ColorPalette.gray300}
            style={styles.linkEditInput}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
          />
          <Pressable
            style={styles.linkEditSave}
            onPress={async () => {
              setLink(linkDraft);
              setIsEditingLink(false);
              await saveField({ media_url: linkDraft || undefined });
            }}
          >
            <Text style={styles.linkEditSaveText}>Save</Text>
          </Pressable>
        </Box>
      </BottomSheet>

      {!isCommentsVisible && (
        <Pressable
          onPress={() => setIsCommentsVisible(true)}
          style={styles.commentsPeek}
        >
          <Box style={styles.commentsPeekHandle} />
          <Text variant="bodySmStrong" color="gray900">
            Comments
          </Text>
        </Pressable>
      )}

      <CommentSection
        visible={isCommentsVisible}
        onClose={() => setIsCommentsVisible(false)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={userId ?? ""}
        currentUserName={currentUser?.name ?? ""}
        currentUserAvatar={currentUserProfilePhotoUrl}
        currentUserSeed={currentUser?.id}
        onSubmitComment={onSubmitComment}
        onReact={onReact}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { backgroundColor: ColorPalette.white },
  body: {
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: Layout.spacing.sm,
    gap: Layout.spacing.sm,
    backgroundColor: ColorPalette.white,
  },
  titleGroup: { gap: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Layout.spacing.xxs,
  },
  activityTitle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: 24,
    color: ColorPalette.gray950,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: 20,
    color: ColorPalette.gray400,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ColorPalette.gray25,
    borderRadius: 8,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 16,
  },
  section: { gap: Layout.spacing.xs },
  editButton: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.blue500,
  },
  addText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.blue500,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
  priceText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapContainer: {
    borderRadius: CornerRadius.md,
    overflow: "hidden",
    height: 160,
  },
  map: { flex: 1 },
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ColorPalette.brand500,
    borderWidth: 2,
    borderColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ColorPalette.white,
  },
  linkEditSheet: {
    padding: Layout.spacing.sm,
    paddingBottom: 32,
    gap: Layout.spacing.sm,
  },
  linkEditTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
    textAlign: "center",
  },
  linkEditInput: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
  },
  linkEditSave: {
    backgroundColor: ColorPalette.brand500,
    borderRadius: CornerRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkEditSaveText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.white,
  },
  commentsPeek: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  commentsPeekHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: ColorPalette.gray300,
    marginBottom: 10,
  },
});
