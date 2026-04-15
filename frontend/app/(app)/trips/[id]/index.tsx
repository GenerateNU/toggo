import { useGetTripMembers } from "@/api/memberships/useGetTripMembers";
import { getPollsByTripIDQueryKey } from "@/api/polls/useGetPollsByTripID";
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
import { Box, Text } from "@/design-system";
import { BackButton } from "@/design-system/components/navigation/arrow";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useShareTripInvite } from "@/hooks/useShareTripInvite";
import { formatTripDates } from "@/utils/date-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Map } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_TAB: TabKey = "new";
const HERO_HEIGHT = 210;
const SHEET_OVERLAP = 24;
const HEADER_FADE_DURATION = 200;
const FIXED_HEADER_HEIGHT = 44;
const HERO_PARALLAX_UP_SHIFT = HERO_HEIGHT * 0.35;
const HERO_PULL_DISTANCE = 120;
const HERO_PULL_SCALE = 1.08;

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
  const [sheetTopActivationY, setSheetTopActivationY] = useState<number | null>(
    null,
  );
  const [dateSheetError, setDateSheetError] = useState<string | null>(null);
  const { shareInvite } = useShareTripInvite(tripID ?? "");
  const updateTripMutation = useUpdateTrip();
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

  const { data: trip, isLoading } = useGetTrip(tripID ?? "", {
    query: { enabled: !!tripID },
  });
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
      dateSheetRef.current?.close();
    } catch {
      setDateSheetError("Could not update trip dates. Please try again.");
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
    } catch (error) {
      console.error("Failed to update trip location:", error);
      // TODO: Show error toast to user
    } finally {
      locationSheetRef.current?.close();
    }
  };

  const handleVoteOnLocation = () => {
    locationSheetRef.current?.close();
    router.push(`/trips/${tripID}/pitches` as any);
  };

  const tripDate = formatTripDates(trip?.start_date, trip?.end_date);

  if (!tripID) {
    return null;
  }

  const titleScrollThreshold =
    sheetTopActivationY == null
      ? Number.POSITIVE_INFINITY
      : sheetTopActivationY - insets.top;

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
  const navOverlayOpacity = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const inFlowHeaderOpacity = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const safeAreaOverlayOpacity = headerAnim;
  const heroParallaxTranslateY = headerScrollY.interpolate({
    inputRange: [-HERO_PULL_DISTANCE, 0, HERO_HEIGHT],
    outputRange: [HERO_PULL_DISTANCE * 0.2, 0, -HERO_PARALLAX_UP_SHIFT],
    extrapolate: "clamp",
  });
  const heroParallaxScale = headerScrollY.interpolate({
    inputRange: [-HERO_PULL_DISTANCE, 0],
    outputRange: [HERO_PULL_SCALE, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
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
          stickyHeaderIndices={[2]}
          scrollEventThrottle={16}
        >
          <View style={styles.heroSection}>
            <Animated.View
              style={[
                styles.heroImageLayer,
                {
                  transform: [
                    { translateY: heroParallaxTranslateY },
                    { scale: heroParallaxScale },
                  ],
                },
              ]}
            >
              <TripHeader coverImageUrl={trip?.cover_image_url} />
            </Animated.View>
            <Animated.View
              style={[
                styles.topNavigation,
                {
                  top: insets.top + Layout.spacing.xs,
                  opacity: navOverlayOpacity,
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
                  onPress={() =>
                    router.push(`/trips/${tripID}/map` as any)
                  }
                  style={styles.mapButton}
                  accessibilityRole="button"
                  accessibilityLabel="View map"
                >
                  <Map size={16} color={ColorPalette.gray950} />
                  <Text variant="bodySmMedium" color="gray950">
                    Map
                  </Text>
                </Pressable>
              </Box>
            </Animated.View>
          </View>

          <Animated.View
            onLayout={(event) => {
              const nextY = event.nativeEvent.layout.y;
              setSheetTopActivationY((previous) =>
                previous === nextY ? previous : nextY,
              );
            }}
            style={{ opacity: inFlowHeaderOpacity }}
          >
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
            </Box>
          </Animated.View>

          <Animated.View
            pointerEvents={headerVisible ? "none" : "auto"}
            style={[styles.stickyHeader, { opacity: inFlowHeaderOpacity }]}
          >
            <Box paddingBottom="xs" backgroundColor="white">
              <TripTabBar
                tripID={tripID}
                activeTab={activeTab}
                onTabPress={handleTabPress}
              />
            </Box>
          </Animated.View>

          <Box
            ref={cardContainerRef}
            paddingHorizontal="sm"
            paddingTop="sm"
            paddingBottom="xl"
            backgroundColor="gray50"
            style={styles.sheetContent}
          >
            {activeTab === "new" && (
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
            {activeTab === "itinerary" && (
              <ItineraryTabContent
                tripID={tripID}
                startDate={trip?.start_date}
                endDate={trip?.end_date}
                parentScrollViewRef={parentScrollViewRef as any}
                parentScrollOffset={parentScrollOffsetRef}
                parentContainerRef={cardContainerRef}
              />
            )}
            {activeTab === "polls" && <PollsTabContent tripId={tripID} />}
            {activeTab !== "new" &&
              activeTab !== "itinerary" &&
              activeTab !== "polls" &&
              activeTab !== "settings" &&
              activeTab !== "activities" && (
                <Box
                  flex={1}
                  alignItems="flex-start"
                  justifyContent="flex-start"
                >
                  <Text variant="bodySmDefault" color="gray400">
                    Post notes, photos, videos, and links
                  </Text>
                </Box>
              )}
            {activeTab === "activities" && (
              <ActivitiesTabContent ref={activitiesTabRef} tripID={tripID} />
            )}
          </Box>
        </Animated.ScrollView>
      </SafeAreaView>

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
          <Text variant="bodyMedium" color="gray950" numberOfLines={1}>
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
    backgroundColor: ColorPalette.white,
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
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xxs,
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
  heroSection: {
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.spacing.xl,
  },
  sheetTop: {
    backgroundColor: ColorPalette.white,
    borderTopLeftRadius: CornerRadius.xxxl,
    borderTopRightRadius: CornerRadius.xxxl,
    overflow: "hidden",
    marginTop: -SHEET_OVERLAP,
  },
  stickyHeader: {
    backgroundColor: ColorPalette.white,
    zIndex: 2,
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
  sheetContent: {
    flexGrow: 1,
  },
});
