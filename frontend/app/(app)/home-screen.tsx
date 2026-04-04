import { getUnreadActivityCountQueryOptions } from "@/api/activity-feed/useGetUnreadActivityCount";
import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { useGetAllTrips } from "@/api/trips/useGetAllTrips";
import { getTrip } from "@/api/trips/useGetTrip";
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
  Screen,
  SkeletonRect,
  Text,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
import { useCreateTrip } from "@/index";
import { useQueries } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";

export default function HomeScreen() {
  const { currentUser, userId } = useUser();
  const { width: viewportWidth } = useWindowDimensions();
  const profile = useProfileAvatar();
  const createTripMutation = useCreateTrip();
  const bottomSheetRef = useRef<any>(null);
  const pendingTripCode = useUserStore((s) => s.pendingTripCode);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

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
  const upcomingCardWidth = Math.max(280, viewportWidth - 72);
  const upcomingCardGap = 12;

  useEffect(() => {
    if (needsProfile) {
      const t = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [needsProfile]);

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

  const handleCreateTrip = async () => {
    const data = {
      name: "Trip Name",
      budget_min: 1,
      budget_max: 1000,
    };
    try {
      const result = await createTripMutation.mutateAsync({ data });
      if (result?.id) {
        router.push(`/trips/${result.id}`);
      }
    } catch (e) {
      console.log("Error creating trip", e);
    }
  };

  const toastIconColor =
    toastVariant === "error" ? "statusError" : "statusSuccess";

  return (
    <Screen>
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
        <Box flex={1} backgroundColor="white" gap="md">
          <Box gap="sm">
            {upcomingTrip ? (
              <LinearGradient
                colors={topSectionGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Box
                  paddingTop="sm"
                  paddingHorizontal="sm"
                  gap="sm"
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
                  <Text variant="headingMd" color="gray900">
                    Upcoming Trips
                  </Text>
                </Box>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={upcomingCardWidth + upcomingCardGap}
                  contentContainerStyle={{ paddingLeft: Layout.spacing.sm, paddingRight: Layout.spacing.sm }}
                  style={{ paddingBottom: Layout.spacing.lg }}
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
                  <Box gap="sm" paddingTop="xl">
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

          <Box gap="sm" paddingHorizontal="sm">
            <Text variant="headingMd" color="gray900">
              Past Trips
            </Text>
            {past.length === 0 ? (
              <Text variant="bodySmDefault" color="gray500">
                No past trips yet.
              </Text>
            ) : (
              <Box gap="sm">
                {past.map((trip) => {
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
              </Box>
            )}
          </Box>

          <Box gap="sm" paddingHorizontal="sm">
            <Text variant="headingMd" color="gray900">
              Recommended Trips
            </Text>
            <RecommendedTripsRow />
          </Box>

          <Box gap="xs" paddingHorizontal="md" paddingTop="md">
            <Button
              layout="textOnly"
              label="See all trips"
              variant="Tertiary"
              onPress={() => router.push("/trips")}
            />
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
    </Screen>
  );
}
