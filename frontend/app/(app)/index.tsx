import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { useTripsList } from "@/api/trips/custom/useTripsList";
import { getTrip } from "@/api/trips/useGetTrip";
import CompleteProfileForm from "@/app/(auth)/components/complete-profile-form";
import { useUserStore } from "@/auth/store";
import { useUser } from "@/contexts/user";
import {
  AnimatedBox,
  BottomSheet,
  Box,
  Icon,
  ImagePicker,
  Text,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useCreateTrip } from "@/index";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Plus, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { TripCard } from "./trips/[id]/components/trip-card";

export default function Home() {
  const { currentUser } = useUser();
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

  // ─── Trips list ────────────────────────────────────────────────────────────

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
    } catch (e) {
      console.log("Error creating trip", e);
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
          <ActivityIndicator size="small" color={ColorPalette.textSubtle} />
        </Box>
      ) : null,
    [isLoadingMoreTrips],
  );

  const { joinedTripName, joinError } = useLocalSearchParams<{
    joinedTripName?: string;
    joinError?: string;
  }>();

  const needsProfile = !currentUser?.username;

  // Open bottom sheet when user has no profile
  useEffect(() => {
    if (needsProfile) {
      const t = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [needsProfile]);

  // Show toast with optional bold text
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
    // Join pending trip if one was saved
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

  // TODO: extract toast into its own component with context after Bart's component library
  return (
    <Box flex={1} backgroundColor="backgroundSubtle">
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id ?? ""}
        renderItem={renderTripItem}
        onEndReached={fetchMoreTrips}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderTripFooter}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Box gap="md">
            {/* Header */}
            <Box
              backgroundColor="backgroundCard"
              padding="lg"
              paddingTop="xl"
              gap="xs"
            >
              <Text variant="headingMd" color="textInverse">
                Home
              </Text>
              {currentUser?.username && (
                <Text variant="bodySmDefault" color="textSubtle">
                  @{currentUser.username}
                </Text>
              )}
            </Box>

            <Box
              flexDirection="row"
              flexWrap="wrap"
              gap="xs"
              paddingHorizontal="sm"
            >
              {[
                { label: "Settings", path: "/settings" },
                { label: "Proof of Concept", path: "/testing" },
                { label: "Design System", path: "/ui-kit" },
              ].map(({ label, path }) => (
                <Pressable
                  key={path}
                  onPress={() => router.push(path as any)}
                  style={({ pressed }) => [
                    styles.chip,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text variant="bodyXsMedium" color="textSubtle">
                    {label}
                  </Text>
                </Pressable>
              ))}
            </Box>

            {/* Trips header row */}
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal="sm"
              paddingTop="xs"
            >
              <Text variant="bodySmMedium" color="textSubtle">
                MY TRIPS
              </Text>
              <Pressable
                onPress={handleCreateTrip}
                disabled={createTripMutation.isPending}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                ]}
              >
                {createTripMutation.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={ColorPalette.textInverse}
                  />
                ) : (
                  <Plus size={14} color={ColorPalette.textInverse} />
                )}
                <Text variant="bodyXsMedium" color="textInverse">
                  New Trip
                </Text>
              </Pressable>
            </Box>

            {isLoadingTrips && (
              <Box alignItems="center" paddingVertical="md">
                <ActivityIndicator color={ColorPalette.textSubtle} />
              </Box>
            )}

            {!isLoadingTrips && trips.length === 0 && (
              <Box alignItems="center" paddingVertical="md">
                <Text variant="bodySmDefault" color="textSubtle">
                  No trips yet — tap New Trip to create one
                </Text>
              </Box>
            )}
          </Box>
        }
      />

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["80%", "95%"]}
        disableClose={needsProfile}
      >
        <Box flex={1} padding="lg" gap="lg">
          <Text variant="bodyMedium" color="textDefault">
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
          backgroundColor="backgroundCard"
          shadowColor="backgroundDefault"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.1}
          shadowRadius={8}
          elevation={4}
        >
          <Box flexDirection="row" alignItems="center" gap="sm" flex={1}>
            <Icon
              icon={Check}
              size="xs"
              color={toastVariant === "error" ? "textDefault" : "textDefault"}
            />
            <Text
              variant="bodySmDefault"
              color={toastVariant === "error" ? "textDefault" : "textDefault"}
              style={{ flexShrink: 1 }}
            >
              {toastPrefix}
              {toastBold && (
                <Text
                  variant="bodySmMedium"
                  color={
                    toastVariant === "error" ? "textDefault" : "textDefault"
                  }
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
            <Icon
              icon={X}
              size="xs"
              color={toastVariant === "error" ? "textDefault" : "textDefault"}
            />
          </Pressable>
        </AnimatedBox>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 40,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: ColorPalette.backgroundCard,
  },
  chipPressed: {
    opacity: 0.7,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: ColorPalette.brandPrimary,
  },
  createButtonPressed: {
    opacity: 0.75,
  },
});
