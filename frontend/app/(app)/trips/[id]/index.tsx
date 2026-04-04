import {
  getPollsByTripIDQueryKey,
  useGetPollsByTripID,
} from "@/api/polls/useGetPollsByTripID";
import { useGetRankPollResults } from "@/api/polls/useGetRankPollResults";
import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
import { useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { TripReminderDateSheet } from "@/app/(app)/components/trip-reminder-date-sheet";
import CreateFAB from "@/app/(app)/trips/[id]/components/create-fab";
import CreatePollSheet, {
  CreatePollSheetMethods,
} from "@/app/(app)/trips/[id]/polls/components/create-poll-sheet";
import RankPollCard from "@/app/(app)/trips/[id]/polls/components/rank-poll-card";
import VotePollCard from "@/app/(app)/trips/[id]/polls/components/vote-poll-card";
import { Box, ErrorState, Text } from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  BellDot,
  Binoculars,
  Calendar,
  ChartColumnBig,
  House,
  List,
  Map,
  MapPin,
  PiggyBank,
  Settings2,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

type TabKey =
  | "new"
  | "itinerary"
  | "polls"
  | "housing"
  | "budget"
  | "activities"
  | "settings";

const INITIAL_TAB: TabKey = "itinerary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTripDates(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startDate).toLocaleDateString("en-US", opts);
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InviteFriendsButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.inviteButton,
        (pressed || loading) && styles.inviteButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Invite friends"
    >
      {loading ? (
        <ActivityIndicator size="small" color={ColorPalette.gray500} />
      ) : (
        <Text variant="bodyXsMedium" color="gray500">
          + Invite Friends
        </Text>
      )}
    </Pressable>
  );
}

type TripTabBarProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

function TripTabBar({ activeTab, onTabPress }: TripTabBarProps) {
  const tabs: Array<{
    key: TabKey;
    label?: string;
    icon: React.ComponentType<any>;
  }> = [
    { key: "new", label: "New", icon: BellDot },
    { key: "itinerary", label: "Itinerary", icon: List },
    { key: "polls", label: "Polls", icon: ChartColumnBig },
    { key: "housing", label: "Housing", icon: House },
    { key: "budget", label: "Budget", icon: PiggyBank },
    { key: "activities", label: "Activities", icon: Binoculars },
    { key: "settings", icon: Settings2 },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarContent}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        return (
          <Pressable
            key={key}
            onPress={() => onTabPress(key)}
            style={({ pressed }) => [
              styles.tabItem,
              isActive ? styles.tabItemActive : styles.tabItemInactive,
              pressed && styles.tabItemPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              size={16}
              color={isActive ? ColorPalette.white : ColorPalette.gray950}
            />
            {label ? (
              <Text
                variant="bodyDefault"
                color={isActive ? "white" : "gray950"}
              >
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ItineraryEmptyState() {
  return (
    <Box borderWidth={1} borderColor="gray200" borderRadius="xl" padding="sm">
      <Box alignItems="center" paddingVertical="lg">
        <Text
          variant="bodyDefault"
          color="gray950"
          style={styles.emptyStateText}
        >
          No activites planned. Get planning!
        </Text>
      </Box>
    </Box>
  );
}

// ─── Polls tab ────────────────────────────────────────────────────────────────

function RankPollRow({
  poll,
  tripId,
  onRanked,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onRanked: () => void;
}) {
  const { data, isLoading, isError, refetch } = useGetRankPollResults(
    tripId,
    poll.id ?? "",
    { query: { enabled: !!(tripId && poll.id) } },
  );

  if (isLoading) {
    return (
      <Box
        backgroundColor="white"
        borderRadius="md"
        alignItems="center"
        padding="lg"
        style={styles.loadingCard}
      >
        <ActivityIndicator color={ColorPalette.brand500} />
      </Box>
    );
  }
  if (isError) {
    return (
      <Box backgroundColor="white" borderRadius="md" style={styles.loadingCard}>
        <ErrorState title="Couldn't load poll" refresh={refetch} />
      </Box>
    );
  }
  if (!data) return null;
  return <RankPollCard poll={data} tripId={tripId} onRanked={onRanked} />;
}

function PollsTabContent({
  tripId,
  onCreatePoll,
}: {
  tripId: string;
  onCreatePoll: () => void;
}) {
  const {
    data: pollsData,
    isLoading,
    isError,
    refetch,
  } = useGetPollsByTripID(tripId, {}, { query: { enabled: !!tripId } });

  const polls = pollsData?.items ?? [];
  const votePolls = polls.filter((p) => p.poll_type !== "rank");
  const rankPolls = polls.filter((p) => p.poll_type === "rank");

  const handleVoted = useCallback(() => refetch(), [refetch]);
  const handleRanked = useCallback(() => refetch(), [refetch]);

  if (isLoading) {
    return (
      <Box alignItems="center" paddingVertical="xl">
        <ActivityIndicator color={ColorPalette.brand500} />
      </Box>
    );
  }

  if (isError) {
    return <ErrorState title="Couldn't load polls" />;
  }

  if (polls.length === 0) {
    return (
      <Box borderWidth={1} borderColor="gray200" borderRadius="xl" padding="sm">
        <Box alignItems="center" paddingVertical="lg">
          <Text
            variant="bodyDefault"
            color="gray950"
            style={styles.emptyStateText}
          >
            No polls yet. Create one!
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box gap="sm">
      {votePolls.map((poll) => (
        <VotePollCard
          key={poll.id}
          poll={poll}
          tripId={tripId}
          onVoted={handleVoted}
        />
      ))}
      {rankPolls.map((poll) => (
        <RankPollRow
          key={poll.id}
          poll={poll}
          tripId={tripId}
          onRanked={handleRanked}
        />
      ))}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Trip() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>(INITIAL_TAB);
  const createInviteMutation = useCreateTripInvite();
  const updateTripMutation = useUpdateTrip();
  const dateSheetRef = useRef<any>(null);
  const createPollSheetRef = useRef<CreatePollSheetMethods>(null);
  const queryClient = useQueryClient();

  const { data: trip, isLoading, refetch } = useGetTrip(tripID!);

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
      queryKey: getPollsByTripIDQueryKey(tripID!),
    });
  }, [queryClient, tripID]);

  const handleInvite = async () => {
    try {
      const invite = await createInviteMutation.mutateAsync({
        tripID: tripID!,
        data: {},
      });
      const code = invite.code;
      if (!code) return;

      const deepLink = Linking.createURL("join", { queryParams: { code } });
      await Share.share({
        message: `Join my trip on Toggo! ${deepLink}`,
        url: deepLink,
      });
    } catch {
      // silently handled
    }
  };

  const handleDateSet = async (range: DateRange) => {
    if (!range.start) return;
    try {
      await updateTripMutation.mutateAsync({
        tripID: tripID!,
        data: {
          start_date: range.start.toISOString(),
          ...(range.end ? { end_date: range.end.toISOString() } : {}),
        },
      });
      await refetch();
    } catch {
      // non-blocking
    } finally {
      dateSheetRef.current?.close();
    }
  };

  const tripDate = formatTripDates(trip?.start_date, trip?.end_date);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="sm"
        paddingVertical="xs"
      >
        <Pressable
          onPress={router.back}
          hitSlop={styles.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={ColorPalette.gray950} />
        </Pressable>

        <Pressable
          onPress={() => router.push(`/trips/${tripID}/search-location` as any)}
          style={styles.mapButton}
          accessibilityRole="button"
          accessibilityLabel="View map"
        >
          <Map size={16} color={ColorPalette.gray950} />
          <Text variant="bodyMedium" color="gray950">
            Map
          </Text>
        </Pressable>
      </Box>

      {/* White content card */}
      <Box style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Trip header */}
          <Box gap="xs" paddingHorizontal="sm" paddingTop="sm">
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              {isLoading ? (
                <Box
                  width={160}
                  height={28}
                  backgroundColor="gray100"
                  borderRadius="xs"
                />
              ) : (
                <Text variant="headingXl" color="gray950">
                  {trip?.name ?? "Trip"}
                </Text>
              )}

              <Box flexDirection="row" alignItems="center" gap="sm">
                <InviteFriendsButton
                  onPress={handleInvite}
                  loading={createInviteMutation.isPending}
                />
                <Pressable
                  onPress={() =>
                    router.push(`/trips/${tripID}/settings` as any)
                  }
                  hitSlop={styles.hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel="Trip settings"
                >
                  <Settings2 size={20} color={ColorPalette.gray950} />
                </Pressable>
              </Box>
            </Box>

            {/* Trip meta */}
            <Box gap="xs">
              <Pressable
                onPress={() => dateSheetRef.current?.snapToIndex(0)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                accessibilityRole="button"
                accessibilityLabel="Set trip dates"
              >
                <Box flexDirection="row" alignItems="center" gap="xxs">
                  <Calendar size={16} color={ColorPalette.gray500} />
                  <Text variant="bodySmDefault" color="gray500">
                    {tripDate ?? "Add dates"}
                  </Text>
                </Box>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push(`/trips/${tripID}/search-location` as any)
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                accessibilityRole="button"
                accessibilityLabel="Set trip location"
              >
                <Box flexDirection="row" alignItems="center" gap="xxs">
                  <MapPin size={16} color={ColorPalette.gray500} />
                  <Text variant="bodySmDefault" color="gray500">
                    Add location
                  </Text>
                </Box>
              </Pressable>
            </Box>
          </Box>

          {/* Tab bar */}
          <Box paddingTop="sm">
            <TripTabBar activeTab={activeTab} onTabPress={handleTabPress} />
          </Box>

          {/* Tab content */}
          <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="xl">
            {activeTab === "itinerary" && <ItineraryEmptyState />}
            {activeTab === "polls" && (
              <PollsTabContent
                tripId={tripID!}
                onCreatePoll={handleOpenCreatePoll}
              />
            )}
          </Box>
        </ScrollView>
      </Box>

      {activeTab === "polls" && (
        <CreateFAB tripID={tripID!} onCreatePoll={handleOpenCreatePoll} />
      )}

      <CreatePollSheet
        ref={createPollSheetRef}
        tripID={tripID!}
        onCreated={handlePollCreated}
      />

      <TripReminderDateSheet
        bottomSheetRef={dateSheetRef}
        onSetDate={handleDateSet}
        onSkip={() => dateSheetRef.current?.close()}
        onDismiss={() => dateSheetRef.current?.close()}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ColorPalette.gray50,
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
    gap: 0,
  },
  inviteButton: {
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 5,
    borderRadius: CornerRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteButtonPressed: {
    opacity: 0.7,
  },
  tabBarContent: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xxs + 4,
    borderRadius: CornerRadius.sm,
  },
  tabItemActive: {
    backgroundColor: ColorPalette.gray950,
  },
  tabItemInactive: {
    backgroundColor: ColorPalette.gray50,
  },
  tabItemPressed: {
    opacity: 0.75,
  },
  emptyStateText: {
    fontStyle: "italic",
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
});
