import { getUnreadActivityCountQueryOptions } from "@/api/activity-feed/useGetUnreadActivityCount";
import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { useGetAllTrips } from "@/api/trips/useGetAllTrips";
import { getTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import type { CreateTripParams } from "@/app/(app)/components/create-trip-sheet";
import { CreateTripSheet } from "@/app/(app)/components/create-trip-sheet";
import {
  HOME_NULL_DATE_DISPLAY,
  HOME_TRIPS_PAGE_SIZE,
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
import CompleteProfileForm from "@/app/(auth)/components/complete-profile-form";
import { useUserStore } from "@/auth/store";
import { useUser } from "@/contexts/user";
import {
  AnimatedBox,
  BottomSheet,
  Box,
  Button,
  ErrorState,
  Icon,
  ImagePicker,
  ProfileAvatarButton,
  SkeletonRect,
  Text,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { useCreateTrip } from "@/index";
import type { ModelsActivity } from "@/types/types.gen";
import { encodeMapViewActivitiesParam } from "@/utils/map-view-activities";
import { useQueries } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Check, PlusIcon, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Example pins around San Francisco for the dev map shortcut. */
const DEV_MAP_SAMPLE_ACTIVITIES: ModelsActivity[] = [
  {
    id: "dev-sample-1",
    name: "Golden Gate Bridge",
    location_name: "Golden Gate Bridge, San Francisco",
    location_lat: 37.8199,
    location_lng: -122.4783,
    dates: [{ start: "2026-06-10", end: "2026-06-10" }],
    time_of_day: "morning",
    description:
      "Iconic suspension bridge and a classic Bay Area viewpoint over the Pacific.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80",
  },
  {
    id: "dev-sample-2",
    name: "Ferry Building",
    location_name: "Ferry Building Marketplace",
    location_lat: 37.7955,
    location_lng: -122.3934,
    dates: [{ start: "2026-06-11", end: "2026-06-12" }],
    time_of_day: "afternoon",
    description:
      "Historic transit hub along the Embarcadero, known for farmers markets and local food.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80",
  },
  {
    id: "dev-sample-3",
    name: "Mission Dolores Park",
    location_name: "Dolores Park, Mission District",
    location_lat: 37.7694,
    location_lng: -122.4253,
    dates: [{ start: "2026-06-13" }],
    time_of_day: "evening",
    description:
      "Sunny urban park with skyline views—a popular spot to relax on weekends.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1564694202779-bc908c327862?w=800&q=80",
  },
];

export default function HomeScreen() {
  const { currentUser, userId } = useUser();
  const { width: viewportWidth } = useWindowDimensions();
  const profile = useProfileAvatar();
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

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
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

  const tripsQuery = useGetAllTrips(
    { limit: HOME_TRIPS_PAGE_SIZE },
    {
      query: {
        enabled: tripsQueryEnabled,
      },
    },
  );

  const allTrips = tripsQuery.data?.items ?? [];
  const { upcoming, past } = partitionTripsForHome(allTrips);
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
    if (needsProfile) {
      const t = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [needsProfile]);

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

      if (params.startDate) {
        await updateTripMutation.mutateAsync({
          tripID: result.id,
          data: {
            start_date: params.startDate,
            ...(params.endDate ? { end_date: params.endDate } : {}),
          },
        });
      }

      router.push(`/trips/${result.id}`);
    } catch {
      // mutation error state covers feedback
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
          <Text
            variant="logoXl"
            color="brand500"
            style={{ fontSize: 26, lineHeight: 32 }}
          >
            toggo
          </Text>
          <Pressable
            onPress={requestCreateTripSheet}
            accessibilityRole="button"
            accessibilityLabel="Create a trip"
          >
            <Box
              width={36}
              height={36}
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
        refreshControl={
          <RefreshControl
            refreshing={tripsQuery.isFetching && !tripsQuery.isPending}
            onRefresh={() => tripsQuery.refetch()}
            tintColor={ColorPalette.brand500}
          />
        }
      >
        <Box flex={1} backgroundColor="white">
          <Box>
            {upcomingTrip ? (
              <LinearGradient
                colors={topSectionGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Box
                paddingHorizontal="sm"
                gap="sm"
                style={{ paddingTop: 20 }}
              >
                  {tripsQueryEnabled && tripsQuery.isPending ? (
                    <SkeletonRect
                      width="full"
                      borderRadius="lg"
                      style={{ height: 260 }}
                    />
                  ) : null}
                  {tripsQueryEnabled && tripsQuery.isError ? (
                    <ErrorState
                      title="Couldn’t load trips"
                      description="Pull to refresh or try again in a moment."
                      refresh={() => tripsQuery.refetch()}
                    />
                  ) : null}
                  <Text variant="headingMd" color="gray950" paddingBottom="sm">
                    Upcoming Trips
                  </Text>
                </Box>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={upcomingCardWidth + upcomingCardGap}
                  contentContainerStyle={{
                    paddingLeft: Layout.spacing.sm,
                    paddingRight: Layout.spacing.sm,
                  }}
                  style={{ paddingBottom: 20 }}
                >
                  <Box flexDirection="row" gap="sm">
                    {upcoming.map((trip) => {
                      const id = trip.id;
                      if (!id) return null;
                      return (
                        <UpcomingTripHeroCard
                          key={id}
                          trip={trip}
                          width={upcomingCardWidth}
                          currentUserId={currentUser?.id}
                          dateLabel={formatTripDateLabel(
                            trip,
                            HOME_NULL_DATE_DISPLAY,
                          )}
                        />
                      );
                    })}
                  </Box>
                </ScrollView>
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
                  {tripsQueryEnabled && tripsQuery.isError ? (
                    <ErrorState
                      title="Couldn't load trips"
                      description="Pull to refresh or try again in a moment."
                      refresh={() => tripsQuery.refetch()}
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

          <Box
            paddingHorizontal="sm"
            gap="sm"
            style={{ paddingTop: 20, paddingBottom: 20 }}
          >
            <Text variant="headingMd" color="gray950">
              Past Trips
            </Text>
            {past.length === 0 ? (
              <Text variant="bodySmDefault" color="gray500">
                No past trips yet.
              </Text>
            ) : (
              past.map((trip) => {
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
              })
            )}
          </Box>

          <Box gap="sm" style={{ paddingTop: 20, paddingBottom: 20 }}>
            <Box paddingHorizontal="sm">
              <Text variant="headingMd" color="gray950">
                Recommended Trips
              </Text>
            </Box>
            <RecommendedTripsRow />
          </Box>

          <Box gap="xs" paddingHorizontal="md" paddingTop="md">
            <Button
              layout="textOnly"
              label="See all trips"
              variant="Tertiary"
              onPress={() => router.push("/trips")}
            />
            {__DEV__ ? (
              <>
                <Button
                  layout="textOnly"
                  label="Map view (dev)"
                  variant="Tertiary"
                  onPress={() =>
                    router.push({
                      pathname: "/map-view",
                      params: {
                        activities: encodeMapViewActivitiesParam(
                          DEV_MAP_SAMPLE_ACTIVITIES,
                        ),
                      },
                    })
                  }
                />
                <Button
                  layout="textOnly"
                  label="Join trip with code (dev)"
                  variant="Tertiary"
                  onPress={() => router.push("/join-trip-code")}
                />
              </>
            ) : null}
          </Box>
        </Box>
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["80%", "95%"]}
        disableClose={needsProfile}
      >
        <Box flex={1} padding="lg" gap="lg">
          <Text variant="bodyMedium" color="gray900">
            Create a profile
          </Text>
          <Box justifyContent="center" alignItems="center">
            <ImagePicker
              variant="circular"
              size={88}
              value={profilePhoto ?? undefined}
              onChange={(uri) => setProfilePhoto(uri)}
              placeholder="Add photo"
            />
          </Box>
          <CompleteProfileForm
            profilePhotoUri={profilePhoto}
            onSuccess={handleProfileCreated}
          />
        </Box>
      </BottomSheet>

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
            <Icon icon={X} size="xs" color="gray500" />
          </Pressable>
        </AnimatedBox>
      )}
    </Box>
  );
}
