import { getUnreadActivityCountQueryOptions } from "@/api/activity-feed/useGetUnreadActivityCount";
import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { usePastTripsList } from "@/api/trips/custom/usePastTripsList";
import { useTripsList } from "@/api/trips/custom/useTripsList";
import { getAllTripsQueryKey } from "@/api/trips/useGetAllTrips";
import { getTrip, getTripQueryKey } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { CreateProfileSheet } from "@/app/(app)/components/create-profile-sheet";
import type { CreateTripParams } from "@/app/(app)/components/create-trip-sheet";
import { CreateTripSheet } from "@/app/(app)/components/create-trip-sheet";
import {
  HOME_HEADER_BUTTON_SIZE,
  HOME_NULL_DATE_DISPLAY,
} from "@/app/(app)/components/home/constants";
import { HomeUpcomingEmptyCard } from "@/app/(app)/components/home/home-upcoming-empty-card";
import { PastTripCompactCard } from "@/app/(app)/components/home/past-trip-compact-card";
import { RecommendedTripsRow } from "@/app/(app)/components/home/recommended-trips-row";
import {
  formatTripDateLabel,
  partitionTripsForHome,
} from "@/app/(app)/components/home/trip-date-utils";
import { UpcomingTripHeroCard } from "@/app/(app)/components/home/upcoming-trip-hero-card";
import { useHomeUIStore } from "@/app/(app)/store/home-ui-store";
import { useUserStore } from "@/auth/store";
import { useUser } from "@/contexts/user";
import {
  AnimatedBox,
  Box,
  ErrorState,
  Icon,
  ProfileAvatarButton,
  SkeletonRect,
  Text,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { useCreateTrip } from "@/index";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Check, PlusIcon, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { currentUser, userId } = useUser();
  const { width: viewportWidth } = useWindowDimensions();
  const profile = useProfileAvatar();
  const queryClient = useQueryClient();
  const createTripMutation = useCreateTrip();
  const updateTripMutation = useUpdateTrip();
  const bottomSheetRef = useRef<any>(null);
  const createTripSheetRef = useRef<any>(null);
  const pendingTripCode = useUserStore((s) => s.pendingTripCode);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);
  const createTripSheetRequested = useHomeUIStore(
    (s) => s.createTripSheetRequested,
  );
  const clearCreateTripSheetRequest = useHomeUIStore(
    (s) => s.clearCreateTripSheetRequest,
  );

  const [showToast, setShowToast] = useState(false);
  const [toastPrefix, setToastPrefix] = useState("");
  const [toastBold, setToastBold] = useState<string | null>(null);
  const [toastSuffix, setToastSuffix] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "error">(
    "success",
  );
  const [toastOpacity] = useState(() => new Animated.Value(0));

  const { joinedTripName, joinError } = useLocalSearchParams<{
    joinedTripName?: string;
    joinError?: string;
  }>();

  const needsProfile = !currentUser?.username;
  const tripsQueryEnabled = Boolean(userId && currentUser?.username);
  const pastTripsCutoff = useMemo(() => new Date().toISOString(), []);

  const {
    trips: allTrips,
    isLoading: isTripsLoading,
    isError: isTripsError,
    isRefetching: isRefetchingTrips,
    fetchMore: fetchMoreUpcoming,
    refetch: refetchAllTrips,
  } = useTripsList();

  const {
    trips: pastTrips,
    isLoading: isPastTripsLoading,
    isError: isPastTripsError,
    isLoadingMore,
    isRefetching: isRefetchingPast,
    fetchMore,
    refetch: refetchPastTrips,
  } = usePastTripsList(pastTripsCutoff);

  const isRefetching = isRefetchingTrips || isRefetchingPast;

  const refetchTrips = useCallback(() => {
    refetchAllTrips();
    refetchPastTrips();
  }, [refetchAllTrips, refetchPastTrips]);

  const { upcoming } = partitionTripsForHome(tripsQueryEnabled ? allTrips : []);
  const upcomingTrip = upcoming[0] ?? null;
  const upcomingTripIds = upcoming
    .map((trip) => trip.id)
    .filter((id): id is string => Boolean(id));
  const unreadCountQueries = useQueries({
    queries: upcomingTripIds.map((tripId) =>
      getUnreadActivityCountQueryOptions(tripId),
    ),
  });
  const hasAnyUnreadUpdates = unreadCountQueries.some(
    (query) => (query.data?.unread_count ?? 0) > 0,
  );
  const topSectionGradientColors: [string, string] = hasAnyUnreadUpdates
    ? [ColorPalette.white, ColorPalette.blue50]
    : [ColorPalette.white, ColorPalette.brand100];
  const upcomingCardWidth = Math.max(
    280,
    viewportWidth - Layout.spacing.sm * 2,
  );
  const upcomingCardGap = 12;

  useEffect(() => {
    if (createTripSheetRequested) {
      createTripSheetRef.current?.snapToIndex(0);
      clearCreateTripSheetRequest();
    }
  }, [createTripSheetRequested, clearCreateTripSheetRequest]);

  const triggerToast = (
    message: string,
    variant: "success" | "error" = "success",
    boldText?: string,
  ) => {
    if (boldText) {
      const idx = message.indexOf(boldText);
      if (idx >= 0) {
        setToastPrefix(message.slice(0, idx));
        setToastBold(boldText);
        setToastSuffix(message.slice(idx + boldText.length));
      } else {
        setToastPrefix(message);
        setToastBold(null);
        setToastSuffix("");
      }
    } else {
      setToastPrefix(message);
      setToastBold(null);
      setToastSuffix("");
    }
    setToastVariant(variant);
    setShowToast(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  useEffect(() => {
    if (joinedTripName) {
      triggerToast(
        `You've been added to ${joinedTripName}!`,
        "success",
        joinedTripName,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedTripName]);

  useEffect(() => {
    if (joinError) {
      triggerToast(joinError, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinError]);

  const handleProfileCreated = async () => {
    bottomSheetRef.current?.close();
    if (pendingTripCode) {
      try {
        const membership = await joinTripByInvite(pendingTripCode);
        setPendingTripCode(null);
        let tripName = "Trip";
        if (membership?.trip_id) {
          try {
            const trip = await getTrip(membership.trip_id);
            tripName = trip?.name ?? tripName;
          } catch {
            // ignore — fallback to generic name
          }
        }
        triggerToast(
          `Profile created & added to ${tripName}!`,
          "success",
          tripName,
        );
      } catch {
        setPendingTripCode(null);
        triggerToast("Profile created!");
      }
    } else {
      triggerToast("Profile created!");
    }
  };

  const handleCreateTrip = () => {
    createTripSheetRef.current?.snapToIndex(0);
  };

  const handleTripCreated = async (params: CreateTripParams) => {
    createTripSheetRef.current?.close();
    try {
      const result = await createTripMutation.mutateAsync({
        data: { name: "New Trip", budget_min: 1, budget_max: 1000 },
      });
      if (!result?.id) return;

      if (params.startDate || params.locationName) {
        const updatedTrip = await updateTripMutation.mutateAsync({
          tripID: result.id,
          data: {
            ...(params.startDate ? { start_date: params.startDate } : {}),
            ...(params.endDate ? { end_date: params.endDate } : {}),
            ...(params.locationName ? { location: params.locationName } : {}),
          },
        });
        queryClient.setQueryData(getTripQueryKey(result.id), updatedTrip);
      }

      await queryClient.invalidateQueries({
        queryKey: getAllTripsQueryKey(),
      });

      router.push(`/trips/${result.id}`);
    } catch {
      triggerToast("Couldn't create trip. Please try again.", "error");
    }
  };

  const toastIconColor =
    toastVariant === "error" ? "statusError" : "statusSuccess";

  const requestCreateTripSheet = useHomeUIStore(
    (s) => s.requestCreateTripSheet,
  );

  return (
    <Box flex={1} backgroundColor="white">
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: ColorPalette.white }}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="sm"
          paddingVertical="sm"
        >
          <ProfileAvatarButton
            profilePhoto={profile.profilePhotoUri}
            seed={profile.seed}
            size="md"
            accessibilityLabel={profile.accessibilityLabel}
            onPress={() => router.push("/settings")}
          />
          <Text variant="logoLx" color="brand500">
            toggo
          </Text>
          <Pressable
            onPress={requestCreateTripSheet}
            accessibilityRole="button"
            accessibilityLabel="Create a trip"
          >
            <Box
              width={HOME_HEADER_BUTTON_SIZE}
              height={HOME_HEADER_BUTTON_SIZE}
              borderRadius="sm"
              backgroundColor="gray50"
              alignItems="center"
              justifyContent="center"
            >
              <Icon icon={PlusIcon} size="iconSm" color="gray900" />
            </Box>
          </Pressable>
        </Box>
      </SafeAreaView>

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            e.nativeEvent;
          const distanceToBottom =
            contentSize.height - contentOffset.y - layoutMeasurement.height;
          if (distanceToBottom < 300) {
            fetchMore();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchTrips}
            tintColor={ColorPalette.brand500}
          />
        }
      >
        <Box flex={1} backgroundColor="white">
          <Box>
            {upcomingTrip || (tripsQueryEnabled && isTripsLoading) ? (
              <LinearGradient
                colors={topSectionGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Box paddingHorizontal="sm" gap="sm" paddingTop="lx">
                  {tripsQueryEnabled && isTripsLoading ? (
                    <SkeletonRect
                      width="full"
                      borderRadius="lg"
                      style={{ height: 260 }}
                    />
                  ) : null}
                  {tripsQueryEnabled && isTripsError ? (
                    <ErrorState
                      title="Couldn’t load trips"
                      description="Pull to refresh or try again in a moment."
                      refresh={refetchTrips}
                    />
                  ) : null}
                  <Text variant="headingMd" color="gray950" paddingBottom="sm">
                    Upcoming Trips
                  </Text>
                </Box>
                <FlatList
                  horizontal
                  data={upcoming}
                  keyExtractor={(trip) => trip.id ?? ""}
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={upcomingCardWidth + upcomingCardGap}
                  contentContainerStyle={{
                    paddingLeft: Layout.spacing.sm,
                    paddingRight: Layout.spacing.sm,
                    paddingBottom: Layout.spacing.lx,
                    gap: upcomingCardGap,
                  }}
                  onEndReachedThreshold={0.5}
                  onEndReached={fetchMoreUpcoming}
                  renderItem={({ item: trip }) => {
                    if (!trip.id) return null;
                    return (
                      <UpcomingTripHeroCard
                        trip={trip}
                        width={upcomingCardWidth}
                        currentUserId={currentUser?.id}
                        dateLabel={formatTripDateLabel(
                          trip,
                          HOME_NULL_DATE_DISPLAY,
                        )}
                      />
                    );
                  }}
                />
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={topSectionGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Box
                  paddingTop="sm"
                  paddingHorizontal="md"
                  paddingBottom="lg"
                  gap="sm"
                >
                  {tripsQueryEnabled && isTripsError ? (
                    <ErrorState
                      title="Couldn’t load trips"
                      description="Pull to refresh or try again in a moment."
                      refresh={refetchTrips}
                    />
                  ) : null}
                  <Box gap="sm">
                    <Text variant="headingMd" color="gray900">
                      Welcome back, {profile.greetingName}
                    </Text>
                    <HomeUpcomingEmptyCard
                      onPressCreateTrip={handleCreateTrip}
                      onPressTripCode={() => router.push("/join-trip-code")}
                    />
                  </Box>
                </Box>
              </LinearGradient>
            )}
          </Box>

          <Box gap="sm" paddingTop="sm">
            <Box paddingHorizontal="sm" paddingVertical="xxs">
              <Text variant="headingMd">Past Trips</Text>
            </Box>
            <Box paddingHorizontal="sm" gap="sm">
              {tripsQueryEnabled && isPastTripsLoading ? (
                <Box gap="sm">
                  <SkeletonRect width="full" style={{ height: 96 }} />
                  <SkeletonRect width="full" style={{ height: 96 }} />
                </Box>
              ) : tripsQueryEnabled && isPastTripsError ? (
                <ErrorState
                  title="Couldn’t load past trips"
                  description="Pull to refresh or try again in a moment."
                  refresh={refetchPastTrips}
                />
              ) : pastTrips.length === 0 ? (
                <Text variant="bodySmDefault" color="gray500">
                  No past trips yet.
                </Text>
              ) : (
                <Box gap="sm">
                  {pastTrips.map((trip) => {
                    const id = trip.id;
                    if (!id) return null;
                    return (
                      <PastTripCompactCard
                        key={id}
                        trip={trip}
                        currentUserId={currentUser?.id}
                        dateLabel={formatTripDateLabel(
                          trip,
                          HOME_NULL_DATE_DISPLAY,
                        )}
                      />
                    );
                  })}
                  {isLoadingMore ? (
                    <Box gap="sm">
                      <SkeletonRect width="full" style={{ height: 96 }} />
                      <SkeletonRect width="full" style={{ height: 96 }} />
                    </Box>
                  ) : null}
                </Box>
              )}
            </Box>
          </Box>

          <Box gap="xs" paddingVertical="lx">
            <Box paddingHorizontal="sm">
              <Text variant="headingMd" color="gray950">
                Recommended Trips
              </Text>
            </Box>
            <RecommendedTripsRow />
          </Box>
          <SafeAreaView edges={["bottom"]} />
        </Box>
      </ScrollView>

      <CreateProfileSheet
        bottomSheetRef={bottomSheetRef}
        needsProfile={needsProfile}
        onSuccess={handleProfileCreated}
      />

      <CreateTripSheet
        bottomSheetRef={createTripSheetRef}
        onCreate={handleTripCreated}
      />

      {showToast && (
        <AnimatedBox
          style={{ opacity: toastOpacity }}
          position="absolute"
          bottom={40}
          left={20}
          right={20}
          borderRadius="sm"
          paddingHorizontal="md"
          paddingVertical="md"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="white"
          shadowColor="gray900"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.12}
          shadowRadius={8}
          elevation={4}
        >
          <Box flexDirection="row" alignItems="center" gap="sm" flex={1}>
            <Icon icon={Check} size="xs" color={toastIconColor} />
            <Text
              variant="bodySmDefault"
              color="gray900"
              style={{ flexShrink: 1 }}
            >
              {toastPrefix}
              {toastBold && (
                <Text
                  variant="bodySmMedium"
                  color="gray900"
                  style={{ fontWeight: "700" }}
                >
                  {toastBold}
                </Text>
              )}
              {toastSuffix}
            </Text>
          </Box>
          <Pressable
            onPress={() => {
              Animated.timing(toastOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => setShowToast(false));
            }}
          >
            <X size={24} />
          </Pressable>
        </AnimatedBox>
      )}
    </Box>
  );
}
