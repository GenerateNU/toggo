import { getActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { useUploadImage } from "@/api/files/custom/useImageUpload";
import { useGetTripMembers } from "@/api/memberships/useGetTripMembers";
import { getPollsByTripIDQueryKey } from "@/api/polls/useGetPollsByTripID";
import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { TripReminderDateSheet } from "@/app/(app)/components/trip-reminder-date-sheet";
import { TripReminderLocationSheet } from "@/app/(app)/components/trip-reminder-location-sheet";
import {
  ActivitiesTabContent,
  type ActivitiesTabContentHandle,
} from "@/app/(app)/trips/[id]/activities/components/activities-tab-content";
import CreateFAB from "@/app/(app)/trips/[id]/components/create-fab";
import { PitchingActiveCard } from "@/app/(app)/trips/[id]/components/pitching-active-card";
import TripHeader from "@/app/(app)/trips/[id]/components/trip-header";
import TripMetadata from "@/app/(app)/trips/[id]/components/trip-metadata";
import TripTabBar, {
  type TabKey,
} from "@/app/(app)/trips/[id]/components/trip-tab-bar";
import ItineraryTabContent from "@/app/(app)/trips/[id]/itinerary-tab/components/itinerary-tab-content";
import ActivityFeedTabContent from "@/app/(app)/trips/[id]/new-activity-tab/components/activity-feed-tab-content";
import CreatePollSheet, {
  CreatePollSheetMethods,
} from "@/app/(app)/trips/[id]/polls/components/create-poll-sheet";
import PollsTabContent from "@/app/(app)/trips/[id]/polls/components/polls-tab-content";
import { PAGE_SIZE } from "@/constants/pagination";
import {
  Box,
  EmptyState,
  ErrorState,
  Icon,
  ImagePicker,
  SkeletonRect,
  Text,
  useToast,
} from "@/design-system";
import type { ImagePickerHandle } from "@/design-system/components/image-picker/image-picker";
import { BackButton } from "@/design-system/components/navigation/arrow";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useShareTripInvite } from "@/hooks/useShareTripInvite";
import { formatTripDates } from "@/utils/date-helpers";
import {
  activityHasMapLocation,
  encodeMapViewActivitiesParam,
} from "@/utils/map-view-activities";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ImagePlus, Map } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { HousingTabContent } from "./housing/components/housing-tab-content";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_TAB: TabKey = "new";
const HERO_HEIGHT = 210;
const SHEET_OVERLAP = 36;
const CONTENT_CARD_TOP = HERO_HEIGHT - SHEET_OVERLAP;
const HEADER_FADE_DURATION = 100;
const FIXED_HEADER_HEIGHT = 44;
const DEFAULT_TABS = [
  "new",
  "itinerary",
  "polls",
  "activities",
  "settings",
  "housing",
] as TabKey[];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Trip() {
  const insets = useSafeAreaInsets();
  const { id: tripID, tab } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (tab as TabKey) || INITIAL_TAB,
  );
  const [headerVisible, setHeaderVisible] = useState(false);
  const [dateSheetError, setDateSheetError] = useState<string | null>(null);
  const toast = useToast();
  const { shareInvite } = useShareTripInvite(tripID ?? "");
  const updateTripMutation = useUpdateTrip();
  const uploadImageMutation = useUploadImage();
  const queryClient = useQueryClient();
  const parentScrollViewRef = useRef<any>(null);
  const parentScrollOffsetRef = useRef(0);
  const headerScrollY = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerVisibleRef = useRef(false);
  const cardContainerRef = useRef<View>(null);
  const dateSheetRef = useRef<any>(null);
  const locationSheetRef = useRef<any>(null);
  const createPollSheetRef = useRef<CreatePollSheetMethods>(null);
  const activitiesTabRef = useRef<ActivitiesTabContentHandle>(null);
  const coverPickerRef = useRef<ImagePickerHandle>(null);
  const [isOpeningMap, setIsOpeningMap] = useState(false);

  const {
    data: trip,
    isLoading,
    isError,
  } = useGetTrip(tripID ?? "", {
    query: { enabled: !!tripID },
  });
  const isCoverUploading =
    uploadImageMutation.isPending || updateTripMutation.isPending;

  const handleCoverImageChange = async (uri: string | null) => {
    if (!tripID || !uri) return;

    try {
      const { imageId } = await uploadImageMutation.mutateAsync({
        uri,
        sizes: ["large", "medium"],
      });

      await updateTripMutation.mutateAsync({
        tripID,
        data: {
          cover_image_id: imageId,
        },
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripID) }),
        queryClient.invalidateQueries({ queryKey: getAllTripsQueryKey({}) }),
        queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY }),
      ]);

      toast.show({ message: "Cover image updated." });
    } catch {
      toast.show({ message: "Couldn't update cover image. Please try again." });
    }
  };
  const { data: tripMembersData } = useGetTripMembers(
    tripID ?? "",
    { limit: 12 },
    {
      query: {
        enabled: !!tripID,
        staleTime: 30_000,
      },
    },
  );
  const tripMembers =
    tripMembersData?.items
      ?.filter((member): member is NonNullable<typeof member> =>
        Boolean(member),
      )
      .map((member) => ({
        userId: member.user_id ?? "",
        name: member.name ?? member.username ?? "Traveler",
        profilePhotoUrl: member.profile_picture_url ?? undefined,
      }))
      .filter((member) => member.userId) ?? [];

  const handleTabPress = (tab: string) => {
    if (tab === "settings") {
      router.push(`/trips/${tripID}/settings` as any);
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenCreatePoll = useCallback(() => {
    createPollSheetRef.current?.open();
  }, []);

  const handleOpenCreateActivity = useCallback(() => {
    setActiveTab("activities");
    setTimeout(() => activitiesTabRef.current?.openAddActivity(), 100);
  }, []);

  const handlePollCreated = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getPollsByTripIDQueryKey(tripID),
    });
  }, [queryClient, tripID]);

  const handleDateSet = async (range: DateRange) => {
    if (!range.start) return;
    setDateSheetError(null);
    try {
      await updateTripMutation.mutateAsync({
        tripID: tripID,
        data: {
          start_date: range.start.toISOString(),
          ...(range.end ? { end_date: range.end.toISOString() } : {}),
        },
      });
      await queryClient.invalidateQueries({
        queryKey: getTripQueryKey(tripID),
      });
      await queryClient.invalidateQueries({
        queryKey: getAllTripsQueryKey(),
      });
      dateSheetRef.current?.close();
    } catch {
      setDateSheetError("Could not update trip dates. Please try again.");
      toast.show({ message: "Couldn't update trip dates. Please try again." });
    }
  };

  const handleLocationPress = () => {
    locationSheetRef.current?.snapToIndex(0);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        locationSheetRef.current?.close();
      };
    }, []),
  );

  const handleSetLocation = async (destination: string) => {
    try {
      await updateTripMutation.mutateAsync({
        tripID: tripID,
        data: {
          location: destination,
        } as any, // TODO: Regenerate types after backend location field is added
      });
      await queryClient.invalidateQueries({
        queryKey: getTripQueryKey(tripID),
      });
      await queryClient.invalidateQueries({
        queryKey: getAllTripsQueryKey(),
      });
    } catch (error) {
      console.error("Failed to update trip location:", error);
      toast.show({
        message: "Couldn't update trip location. Please try again.",
      });
    } finally {
      locationSheetRef.current?.close();
    }
  };

  const handleVoteOnLocation = () => {
    locationSheetRef.current?.close();
    router.push(`/trips/${tripID}/pitches` as any);
  };

  const tripDate = formatTripDates(trip?.start_date, trip?.end_date);

  const handleOpenMapView = useCallback(async () => {
    if (!tripID || isOpeningMap) return;

    setIsOpeningMap(true);
    try {
      const allActivities: any[] = [];
      let cursor: string | undefined;

      for (let i = 0; i < 50; i += 1) {
        const page = await getActivitiesByTripID(tripID, {
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        });

        const items = page?.items ?? [];
        allActivities.push(...items);

        if (!page?.next_cursor || items.length === 0) {
          break;
        }
        cursor = page.next_cursor;
      }

      const locationActivities = allActivities.filter((activity) =>
        activityHasMapLocation(activity),
      );

      router.push({
        pathname: "/map-view",
        params: {
          activities: encodeMapViewActivitiesParam(locationActivities),
        },
      });
    } catch {
      toast.show({
        message: "Couldn't load map activities. Please try again.",
      });
    } finally {
      setIsOpeningMap(false);
    }
  }, [tripID, isOpeningMap, toast]);

  if (!tripID) {
    return null;
  }

  const titleScrollThreshold = CONTENT_CARD_TOP - 12;

  const handleParentScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: headerScrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        const nextOffset = e.nativeEvent.contentOffset.y;
        parentScrollOffsetRef.current = nextOffset;

        const shouldShow = nextOffset > titleScrollThreshold;
        if (shouldShow !== headerVisibleRef.current) {
          headerVisibleRef.current = shouldShow;
          setHeaderVisible(shouldShow);
          Animated.timing(headerAnim, {
            toValue: shouldShow ? 1 : 0,
            duration: HEADER_FADE_DURATION,
            useNativeDriver: true,
          }).start();
        }
      },
    },
  );

  const headerOpacity = headerAnim;
  const safeAreaOverlayOpacity = headerAnim;
  const heroScale = headerScrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolateRight: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* Hero image — absolutely positioned behind scroll, scales from top on pull-down */}
      <Animated.View
        pointerEvents="none"
        style={[styles.heroContainer, { transform: [{ scale: heroScale }] }]}
      >
        <View style={styles.heroClip}>
          <TripHeader coverImageUrl={trip?.cover_image_url} />
        </View>
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.safeAreaTopOverlay,
            {
              height: insets.top,
              opacity: safeAreaOverlayOpacity,
            },
          ]}
        />
        <Animated.ScrollView
          ref={parentScrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleParentScroll}
          scrollEventThrottle={16}
        >
          {/* Hero spacer — tappable to add cover photo when no image exists */}
          {!trip?.cover_image_url ? (
            <Pressable
              style={{
                height: CONTENT_CARD_TOP,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => coverPickerRef.current?.openSheet()}
              disabled={isCoverUploading || isLoading}
            >
              <Icon icon={ImagePlus} size="md" color="blue500" />
            </Pressable>
          ) : (
            <View style={{ height: CONTENT_CARD_TOP }} />
          )}
          <View>
            <Box style={styles.sheetTop} backgroundColor="white">
              <TripMetadata
                tripName={trip?.name}
                tripDate={tripDate}
                tripLocation={(trip as any)?.location}
                members={tripMembers}
                isLoading={isLoading}
                isCollapsed={false}
                onInviteFriends={shareInvite}
                onSettingsPress={() =>
                  router.push(`/trips/${tripID}/settings` as any)
                }
                onDatePress={() => dateSheetRef.current?.snapToIndex(0)}
                onLocationPress={handleLocationPress}
              />
              <Box paddingVertical="sm">
                <TripTabBar
                  tripID={tripID}
                  activeTab={activeTab}
                  onTabPress={handleTabPress}
                />
              </Box>
            </Box>
          </View>
          <Box
            flex={1}
            paddingHorizontal="sm"
            paddingTop="xxs"
            paddingBottom="xl"
            backgroundColor="gray25"
            style={styles.sheetContent}
          >
            {isLoading ? (
              <Box gap="sm">
                <SkeletonRect
                  width="full"
                  borderRadius="md"
                  style={{ height: 120 }}
                />
                <SkeletonRect
                  width="full"
                  borderRadius="md"
                  style={{ height: 120 }}
                />
                <SkeletonRect
                  width="threeQuarter"
                  borderRadius="md"
                  style={{ height: 90 }}
                />
              </Box>
            ) : null}
            {!isLoading && isError ? (
              <ErrorState
                title="Couldn't load trip"
                description="Pull to refresh or try again in a moment."
              />
            ) : null}
            {!isLoading && !isError && !trip ? (
              <EmptyState
                title="Trip not found"
                description="This trip may have been removed or you may not have access to it."
              />
            ) : null}
            {!isLoading && !isError && trip && activeTab === "new" && (
              <Box gap="sm">
                {trip?.pitch_deadline &&
                  new Date(trip.pitch_deadline) > new Date() && (
                    <PitchingActiveCard
                      tripID={tripID}
                      deadline={new Date(trip.pitch_deadline)}
                      onViewPitches={() =>
                        router.push(`/trips/${tripID}/pitches` as any)
                      }
                    />
                  )}
                <ActivityFeedTabContent tripId={tripID} />
              </Box>
            )}
            {!isLoading && !isError && trip && activeTab === "itinerary" && (
              <ItineraryTabContent
                tripID={tripID}
                startDate={trip?.start_date}
                endDate={trip?.end_date}
                parentScrollViewRef={parentScrollViewRef}
                parentScrollOffset={parentScrollOffsetRef}
                parentContainerRef={cardContainerRef}
              />
            )}
            {activeTab === "polls" && <PollsTabContent tripId={tripID} />}
            {activeTab === "activities" && (
              <ActivitiesTabContent ref={activitiesTabRef} tripID={tripID} />
            )}
            {activeTab === "housing" && <HousingTabContent tripID={tripID} />}
            {!DEFAULT_TABS.includes(activeTab) && (
              <EmptyState
                title="Nothing here yet"
                description="Post notes, photos, videos, and links."
              />
            )}
          </Box>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Hidden ImagePicker provides the bottom sheet for cover image selection.
          The visual (camera icon) lives in TripHeader, behind the card. */}
      {!trip?.cover_image_url && (
        <View style={styles.hiddenPicker}>
          <ImagePicker
            ref={coverPickerRef}
            variant="rectangular"
            width="100%"
            height={1}
            onChange={handleCoverImageChange}
            showRemoveAction={false}
            showPlaceholderText={false}
            title="Add cover photo"
          />
        </View>
      )}

      {/* Nav buttons — absolute over hero, always visible behind the fixed header */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.topNavigation,
          {
            top: insets.top + Layout.spacing.xs,
          },
        ]}
      >
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="sm"
          paddingVertical="xs"
        >
          <BackButton hasBackground />
          <Pressable
            onPress={handleOpenMapView}
            style={styles.mapButton}
            accessibilityRole="button"
            accessibilityLabel="View map"
            disabled={isOpeningMap}
          >
            <Map size={16} color={ColorPalette.gray950} />
            <Text
              variant="bodySmMedium"
              color="gray950"
              style={{ marginLeft: 4 }}
            >
              Map
            </Text>
          </Pressable>
        </Box>
      </Animated.View>

      <Animated.View
        pointerEvents={headerVisible ? "auto" : "none"}
        style={[
          styles.fixedHeaderTitle,
          {
            paddingTop: insets.top,
            opacity: headerOpacity,
          },
        ]}
      >
        <Box
          height={FIXED_HEADER_HEIGHT}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="sm"
        >
          <Text variant="headingMd" color="gray950" numberOfLines={1}>
            {trip?.name?.trim() || "Trip"}
          </Text>
        </Box>
        <Box paddingBottom="xs" backgroundColor="white">
          <TripTabBar
            tripID={tripID}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </Box>
      </Animated.View>

      {activeTab !== "itinerary" && (
        <CreateFAB
          tripID={tripID}
          onCreatePoll={handleOpenCreatePoll}
          onCreateActivity={handleOpenCreateActivity}
        />
      )}

      <CreatePollSheet
        ref={createPollSheetRef}
        tripID={tripID}
        onCreated={handlePollCreated}
      />

      <TripReminderDateSheet
        bottomSheetRef={dateSheetRef}
        onSetDate={handleDateSet}
        onSkip={() => dateSheetRef.current?.close()}
        onDismiss={() => dateSheetRef.current?.close()}
        error={dateSheetError}
      />

      <TripReminderLocationSheet
        bottomSheetRef={locationSheetRef}
        onSetLocation={handleSetLocation}
        onVoteOnLocation={handleVoteOnLocation}
        onDismiss={() => locationSheetRef.current?.close()}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  safeAreaTopOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: ColorPalette.white,
    zIndex: 3,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: 12,
    paddingVertical: Layout.spacing.xs,
    borderRadius: CornerRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    transformOrigin: "top",
  },
  heroClip: {
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  hiddenPicker: {
    height: 0,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
  },
  sheetTop: {
    backgroundColor: ColorPalette.white,
    borderTopLeftRadius: CornerRadius.xxxl,
    borderTopRightRadius: CornerRadius.xxxl,
    overflow: "hidden",
  },
  sheetContent: {
    flexGrow: 1,
  },
  fixedHeaderTitle: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    backgroundColor: ColorPalette.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
});
