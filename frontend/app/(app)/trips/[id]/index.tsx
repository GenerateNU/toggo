import { getActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { useUploadImage } from "@/api/files/custom/useImageUpload";
import { getPollsByTripIDQueryKey } from "@/api/polls/useGetPollsByTripID";
import { TRIPS_QUERY_KEY } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { TripReminderDateSheet } from "@/app/(app)/components/trip-reminder-date-sheet";
import { TripReminderLocationSheet } from "@/app/(app)/components/trip-reminder-location-sheet";
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
  SkeletonRect,
  Text,
  useToast,
} from "@/design-system";
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
import { Map } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_TAB: TabKey = "new";
const CARD_TOP_OFFSET = 120;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Trip() {
  const { id: tripID, tab } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (tab as TabKey) || INITIAL_TAB,
  );
  const [isOpeningMap, setIsOpeningMap] = useState(false);
  const [dateSheetError, setDateSheetError] = useState<string | null>(null);
  const toast = useToast();
  const { shareInvite } = useShareTripInvite(tripID ?? "");
  const updateTripMutation = useUpdateTrip();
  const uploadImageMutation = useUploadImage();
  const queryClient = useQueryClient();
  const parentScrollViewRef = useRef<ScrollView>(null);
  const parentScrollOffsetRef = useRef(0);
  const cardContainerRef = useRef<View>(null);
  const dateSheetRef = useRef<any>(null);
  const locationSheetRef = useRef<any>(null);
  const createPollSheetRef = useRef<CreatePollSheetMethods>(null);

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

  const handleTabPress = (tab: TabKey) => {
    if (tab === "settings") {
      router.push(`/trips/${tripID}/settings` as any);
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenCreatePoll = useCallback(() => {
    createPollSheetRef.current?.open();
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

  return (
    <View style={styles.container}>
      <TripHeader
        coverImageUrl={trip?.cover_image_url}
        onChangeCoverImage={handleCoverImageChange}
        isCoverUploading={isCoverUploading}
        disabled={isLoading}
      />

      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
        pointerEvents="box-none"
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
          >
            <Map size={16} color={ColorPalette.gray950} />
            <Text variant="bodySmMedium" color="gray950">
              {isOpeningMap ? "Loading..." : "Map"}
            </Text>
          </Pressable>
        </Box>

        <View ref={cardContainerRef} style={styles.card}>
          <ScrollView
            ref={parentScrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={(e) => {
              parentScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            <Box backgroundColor="white">
              <TripMetadata
                tripName={trip?.name}
                tripDate={tripDate}
                tripLocation={(trip as any)?.location}
                isLoading={isLoading}
                onInviteFriends={shareInvite}
                onSettingsPress={() =>
                  router.push(`/trips/${tripID}/settings` as any)
                }
                onDatePress={() => dateSheetRef.current?.snapToIndex(0)}
                onLocationPress={handleLocationPress}
              />

              <Box paddingVertical="sm">
                <TripTabBar activeTab={activeTab} onTabPress={handleTabPress} />
              </Box>
            </Box>

            <Box
              paddingHorizontal="sm"
              paddingTop="sm"
              paddingBottom="xl"
              backgroundColor="gray25"
              style={styles.tabContent}
            >
              {isLoading ? (
                <Box gap="sm">
                  <SkeletonRect width="full" style={{ height: 120 }} />
                  <SkeletonRect width="full" style={{ height: 120 }} />
                  <SkeletonRect width="threeQuarter" style={{ height: 90 }} />
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
              {!isLoading && !isError && trip && activeTab === "polls" && (
                <PollsTabContent tripId={tripID} />
              )}
            </Box>
          </ScrollView>
        </View>
      </SafeAreaView>

      {activeTab !== "itinerary" && (
        <CreateFAB tripID={tripID} onCreatePoll={handleOpenCreatePoll} />
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
    backgroundColor: ColorPalette.gray950,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xxs,
    borderRadius: CornerRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    flex: 1,
    backgroundColor: ColorPalette.gray25,
    borderTopLeftRadius: CornerRadius.xxxl,
    borderTopRightRadius: CornerRadius.xxxl,
    overflow: "hidden",
    marginTop: CARD_TOP_OFFSET,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.spacing.xl,
  },
  tabContent: {
    flexGrow: 1,
  },
});
