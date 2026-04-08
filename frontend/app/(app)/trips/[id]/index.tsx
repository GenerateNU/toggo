import { getPollsByTripIDQueryKey } from "@/api/polls/useGetPollsByTripID";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { TripReminderDateSheet } from "@/app/(app)/components/trip-reminder-date-sheet";
import { TripReminderLocationSheet } from "@/app/(app)/components/trip-reminder-location-sheet";
import CreateFAB from "@/app/(app)/trips/[id]/components/create-fab";
import ItineraryEmptyState from "@/app/(app)/trips/[id]/components/itinerary-empty-state";
import TripHeader from "@/app/(app)/trips/[id]/components/trip-header";
import TripMetadata from "@/app/(app)/trips/[id]/components/trip-metadata";
import TripTabBar, {
  type TabKey,
} from "@/app/(app)/trips/[id]/components/trip-tab-bar";
import CreatePollSheet, {
  CreatePollSheetMethods,
} from "@/app/(app)/trips/[id]/polls/components/create-poll-sheet";
import PollsTabContent from "@/app/(app)/trips/[id]/polls/components/polls-tab-content";
import { BackButton } from "@/design-system/components/navigation/arrow";
import { Box, Text } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useShareTripInvite } from "@/hooks/useShareTripInvite";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Map } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_TAB: TabKey = "itinerary";
const CARD_TOP_OFFSET = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTripDates(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startDate).toLocaleDateString("en-US", opts);
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Trip() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>(INITIAL_TAB);
  const { shareInvite } = useShareTripInvite(tripID ?? "");
  const updateTripMutation = useUpdateTrip();
  const queryClient = useQueryClient();
  const dateSheetRef = useRef<any>(null);
  const locationSheetRef = useRef<any>(null);
  const createPollSheetRef = useRef<CreatePollSheetMethods>(null);

  const { data: trip, isLoading } = useGetTrip(tripID ?? "", {
    query: { enabled: !!tripID },
  });

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
    } catch {
      // non-blocking
    } finally {
      dateSheetRef.current?.close();
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

  return (
    <View style={styles.container}>
      <TripHeader coverImageUrl={trip?.cover_image_url} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="sm"
          paddingVertical="xs"
        >
          <BackButton />

          <Pressable
            onPress={() =>
              router.push(`/trips/${tripID}/search-location` as any)
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

        <Box style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
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

            <Box paddingTop="sm">
              <TripTabBar activeTab={activeTab} onTabPress={handleTabPress} />
            </Box>

            <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="xl">
              {activeTab === "itinerary" && <ItineraryEmptyState />}
              {activeTab === "polls" && <PollsTabContent tripId={tripID} />}
            </Box>
          </ScrollView>
        </Box>
      </SafeAreaView>

      <CreateFAB tripID={tripID} onCreatePoll={handleOpenCreatePoll} />

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
    backgroundColor: ColorPalette.white,
    borderTopLeftRadius: CornerRadius.xl,
    borderTopRightRadius: CornerRadius.xl,
    overflow: "hidden",
    marginTop: CARD_TOP_OFFSET,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
  },
});
