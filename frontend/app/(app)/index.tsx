import { useTripsList } from "@/api/trips/custom/useTripsList";
import { CreateProfileSheet } from "@/app/(app)/components/create-profile-sheet";
import { HomeHeader } from "@/app/(app)/components/home-header";
import { NavChips } from "@/app/(app)/components/nav-chips";
import { TripsSectionHeader } from "@/app/(app)/components/trips-section-header";
import { useUser } from "@/contexts/user";
import { Box, EmptyState, ErrorState, SkeletonRect } from "@/design-system";
import ResourceView, {
  type Resource,
} from "@/design-system/components/high-order/resource-view";
import { Layout } from "@/design-system/tokens/layout";
import { useDeeplinkInvite } from "@/hooks/useDeeplinkInvite";
import { useCreateTrip } from "@/index";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { TripCard } from "./trips/[id]/components/trip-card";

function TripsListSkeleton() {
  return (
    <Box gap="xs" paddingHorizontal="sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonRect key={i} width="full" height="lg" borderRadius="sm" />
      ))}
    </Box>
  );
}

export default function Home() {
  const { currentUser } = useUser();
  const createTripMutation = useCreateTrip();
  const bottomSheetRef = useRef<any>(null);
  const { handleProfileCreated } = useDeeplinkInvite();

  const needsProfile = !currentUser?.username;

  useEffect(() => {
    if (needsProfile) {
      const t = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
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

  const handleCreateTrip = useCallback(async () => {
    try {
      const result = await createTripMutation.mutateAsync({
        data: { name: "Spring Break", budget_min: 1, budget_max: 1000 },
      });
      if (result?.id) {
        prependTrip(result);
      }
    } catch {
      // handled silently, mutation error state covers feedback
    }
  }, [createTripMutation, prependTrip]);

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
        bottomSheetRef={bottomSheetRef}
        needsProfile={needsProfile}
        onSuccess={async () => {
          bottomSheetRef.current?.close();
          await handleProfileCreated();
        }}
      />
    </Box>
  );
}
