import { useTripsList } from "@/api/trips/custom/useTripsList";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { CreateProfileSheet } from "@/app/(app)/components/create-profile-sheet";
import { HomeHeader } from "@/app/(app)/components/home-header";
import { NavChips } from "@/app/(app)/components/nav-chips";
import { TripReminderDateSheet } from "@/app/(app)/components/trip-reminder-date-sheet";
import { TripReminderLocationSheet } from "@/app/(app)/components/trip-reminder-location-sheet";
import { TripsSectionHeader } from "@/app/(app)/components/trips-section-header";
import { useUser } from "@/contexts/user";
import { Box, EmptyState, ErrorState, SkeletonRect } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import ResourceView, {
  type Resource,
} from "@/design-system/components/high-order/resource-view";
import { Layout } from "@/design-system/tokens/layout";
import { useDeeplinkInvite } from "@/hooks/useDeeplinkInvite";
import { useCreateTrip } from "@/index";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { TripCard } from "./trips/[id]/components/trip-card";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TripsListSkeleton() {
  return (
    <Box gap="xs" paddingHorizontal="sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonRect key={i} width="full" height="lg" borderRadius="sm" />
      ))}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { currentUser } = useUser();
  const createTripMutation = useCreateTrip();
  const updateTripMutation = useUpdateTrip();
  const profileSheetRef = useRef<any>(null);
  const locationSheetRef = useRef<any>(null);
  const dateSheetRef = useRef<any>(null);
  const { handleProfileCreated } = useDeeplinkInvite();

  const [pendingTripID, setPendingTripID] = useState<string | null>(null);
  // Prevents double-navigation when both a button press and BottomSheet's
  // onClose fire for the same dismissal.
  const navigationGuardRef = useRef(false);

  const needsProfile = !currentUser?.username;

  useEffect(() => {
    if (needsProfile) {
      const t = setTimeout(() => {
        profileSheetRef.current?.snapToIndex(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [needsProfile]);

  const {
    trips,
    isLoading: isLoadingTrips,
    isLoadingMore: isLoadingMoreTrips,
    fetchMore: fetchMoreTrips,
    prependTrip,
  } = useTripsList();

  // ─── Trip creation flow ──────────────────────────────────────────────────

  const handleCreateTrip = useCallback(async () => {
    try {
      const result = await createTripMutation.mutateAsync({
        data: { name: "New Trip", budget_min: 1, budget_max: 1000 },
      });
      if (result?.id) {
        prependTrip(result);
        setPendingTripID(result.id);
        navigationGuardRef.current = false;
        setTimeout(() => locationSheetRef.current?.snapToIndex(0), 300);
      }
    } catch {
      // mutation error state covers feedback
    }
  }, [createTripMutation, prependTrip]);

  const openDateSheet = useCallback(() => {
    setTimeout(() => dateSheetRef.current?.snapToIndex(0), 300);
  }, []);

  const navigateToTrip = useCallback(
    (tripID: string) => {
      if (navigationGuardRef.current) return;
      navigationGuardRef.current = true;
      dateSheetRef.current?.close();
      locationSheetRef.current?.close();
      setPendingTripID(null);
      router.push(`/trips/${tripID}` as any);
    },
    [],
  );

  // ─── Location sheet handlers ─────────────────────────────────────────────

  const handleLocationSet = useCallback(() => {
    if (!pendingTripID) return;
    // The trip model has no location field yet — navigate to the dedicated
    // search-location screen where the user can pick a precise location.
    locationSheetRef.current?.close();
    router.push(`/trips/${pendingTripID}/search-location` as any);
    setPendingTripID(null);
  }, [pendingTripID]);

  const handleLocationSkipped = useCallback(() => {
    locationSheetRef.current?.close();
    openDateSheet();
  }, [openDateSheet]);

  // ─── Date sheet handlers ─────────────────────────────────────────────────

  const handleDateSet = useCallback(
    async (range: DateRange) => {
      if (!pendingTripID || !range.start) return;
      const tripID = pendingTripID;
      try {
        await updateTripMutation.mutateAsync({
          tripID,
          data: {
            start_date: range.start.toISOString(),
            ...(range.end ? { end_date: range.end.toISOString() } : {}),
          },
        });
      } catch {
        // non-blocking — navigate to trip regardless
      }
      navigateToTrip(tripID);
    },
    [pendingTripID, updateTripMutation, navigateToTrip],
  );

  const handleDateSkipped = useCallback(() => {
    if (pendingTripID) navigateToTrip(pendingTripID);
  }, [pendingTripID, navigateToTrip]);

  // ─── Trip list rendering ─────────────────────────────────────────────────

  const renderTripItem = useCallback(
    ({ item }: { item: ModelsTripAPIResponse }) => <TripCard trip={item} />,
    [],
  );

  const renderTripFooter = useCallback(
    () =>
      isLoadingMoreTrips ? (
        <Box paddingVertical="sm" alignItems="center">
          <ActivityIndicator size="small" />
        </Box>
      ) : null,
    [isLoadingMoreTrips],
  );

  const tripsResource: Resource<ModelsTripAPIResponse[]> = {
    data: trips,
    loading: isLoadingTrips,
  };

  return (
    <Box flex={1} backgroundColor="white">
      <HomeHeader username={currentUser?.username} />
      <Box paddingTop="md" gap="sm">
        <NavChips />
        <TripsSectionHeader
          onCreateTrip={handleCreateTrip}
          isCreating={createTripMutation.isPending}
        />
      </Box>

      <ResourceView
        resourceState={tripsResource}
        loadingComponent={<TripsListSkeleton />}
        emptyComponent={
          <Box alignItems="center" paddingHorizontal="md" paddingVertical="xl">
            <EmptyState
              title="No trips yet"
              description="Tap New Trip to plan your first adventure."
            />
          </Box>
        }
        errorComponent={
          <Box paddingHorizontal="md" paddingVertical="xl">
            <ErrorState title="Couldn't load trips" />
          </Box>
        }
        successComponent={
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id ?? ""}
            renderItem={renderTripItem}
            onEndReached={fetchMoreTrips}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderTripFooter}
            contentContainerStyle={{
              paddingVertical: Layout.spacing.xs,
              gap: Layout.spacing.xs,
            }}
          />
        }
      />

      <CreateProfileSheet
        bottomSheetRef={profileSheetRef}
        needsProfile={needsProfile}
        onSuccess={async () => {
          profileSheetRef.current?.close();
          await handleProfileCreated();
        }}
      />

      <TripReminderLocationSheet
        bottomSheetRef={locationSheetRef}
        onSetLocation={handleLocationSet}
        onVoteOnLocation={handleLocationSkipped}
        onDismiss={handleLocationSkipped}
      />

      <TripReminderDateSheet
        bottomSheetRef={dateSheetRef}
        onSetDate={handleDateSet}
        onSkip={handleDateSkipped}
        onDismiss={handleDateSkipped}
      />
    </Box>
  );
}
