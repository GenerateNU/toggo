import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { TripReminderDateSheet } from "@/app/(app)/components/trip-reminder-date-sheet";
import { BottomSheet, Box, Button, Chip, Text, TextField } from "@/design-system";
import { BackButton } from "@/design-system/components/navigation/arrow";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  BellDot,
  Binoculars,
  Calendar,
  ChartColumnBig,
  House,
  List,
  Map,
  MapPin,
  PiggyBank,
  Settings,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
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
  if (loading) {
    return <ActivityIndicator size="small" color={ColorPalette.gray500} />;
  }
  return <Chip label="+ Invite Friends" onPress={onPress} />;
}

type TripTabBarProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

function TripTabBar({ activeTab, onTabPress }: TripTabBarProps) {
  const tabs: { key: TabKey; label?: string; icon: LucideIcon | undefined }[] = [
    { key: "new", label: "New", icon: BellDot },
    { key: "itinerary", label: "Itinerary", icon: List },
    { key: "polls", label: "Polls", icon: ChartColumnBig },
    { key: "housing", label: "Housing", icon: House },
    { key: "budget", label: "Budget", icon: PiggyBank },
    { key: "activities", label: "Activities", icon: Binoculars },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarContent}
    >
      {tabs.map(({ key, label, icon }) => (
        <Chip
          key={key}
          label={label ?? ""}
          icon={icon}
          selected={activeTab === key}
          onPress={() => onTabPress(key)}
          variant="filled"
        />
      ))}
    </ScrollView>
  );
}

function ItineraryEmptyState() {
  return (
    <Box borderWidth={1} borderColor="gray200" borderRadius="xl" padding="sm">
      <Box alignItems="center" paddingVertical="lg">
        <Text
          variant="bodySmDefault"
          color="gray950"
          style={styles.emptyStateText}
        >
          No activites planned. Get planning!
        </Text>
      </Box>
    </Box>
  );
}

type LocationOptionsSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  locationDraft: string;
  onLocationDraftChange: (text: string) => void;
  onLocationConfirm: () => void;
  onVoteOnDestination: () => void;
  onDismiss: () => void;
};

function LocationOptionsSheet({
  bottomSheetRef,
  locationDraft,
  onLocationDraftChange,
  onLocationConfirm,
  onVoteOnDestination,
  onDismiss,
}: LocationOptionsSheetProps) {
  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={["45%"]}
      onClose={onDismiss}
    >
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="lg" gap="md">
        <Box gap="xxs">
          <Text variant="headingMd" color="gray950">
            Where are you going?
          </Text>
          <Text variant="bodyDefault" color="gray500">
            Set your trip destination
          </Text>
        </Box>
        <Box gap="sm">
          <TextField
            value={locationDraft}
            onChangeText={onLocationDraftChange}
            placeholder="e.g. Paris, France"
            returnKeyType="done"
            onSubmitEditing={onLocationConfirm}
          />
          <Button
            layout="textOnly"
            label="Set Location"
            variant="Primary"
            onPress={onLocationConfirm}
          />
          <Button
            layout="textOnly"
            label="Vote on a Destination"
            variant="Secondary"
            onPress={onVoteOnDestination}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Trip() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>(INITIAL_TAB);
  const createInviteMutation = useCreateTripInvite();
  const updateTripMutation = useUpdateTrip();
  const queryClient = useQueryClient();
  const dateSheetRef = useRef<any>(null);
  const locationSheetRef = useRef<any>(null);

  const [locationDraft, setLocationDraft] = useState("");
  const [locationText, setLocationText] = useState<string | null>(null);

  const { data: trip, isLoading } = useGetTrip(tripID!);

  const handleTabPress = (tab: TabKey) => {
    if (tab === "settings") {
      router.push(`/trips/${tripID}/settings` as any);
      return;
    }
    setActiveTab(tab);
  };

  const handleInvite = async () => {
    try {
      const invite = await createInviteMutation.mutateAsync({
        tripID: tripID!,
        data: {},
      });
      const code = invite.code;
      if (!code) return;

      const deepLink = Linking.createURL(`invite/${code}`);
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
      await queryClient.invalidateQueries({
        queryKey: getTripQueryKey(tripID!),
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

  const handleLocationConfirm = () => {
    if (locationDraft.trim()) {
      setLocationText(locationDraft.trim());
    }
    locationSheetRef.current?.close();
  };

  const handleVoteOnDestination = () => {
    locationSheetRef.current?.close();
    router.push(`/trips/${tripID}/pitches/creation` as any);
  };

  const tripDate = formatTripDates(trip?.start_date, trip?.end_date);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Cover image background */}
      {trip?.cover_image_url ? (
        <Image
          source={{ uri: trip.cover_image_url }}
          style={styles.coverImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.coverImage, styles.coverImageFallback]} />
      )}

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
                  <Text variant="headingMd" color="gray950">
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
                    <Settings size={20} color={ColorPalette.gray950} />
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
                  onPress={handleLocationPress}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  accessibilityRole="button"
                  accessibilityLabel="Set trip location"
                >
                  <Box flexDirection="row" alignItems="center" gap="xxs">
                    <MapPin size={16} color={ColorPalette.gray500} />
                    <Text variant="bodySmDefault" color="gray500">
                      {locationText ?? "Add location"}
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
            <Box paddingHorizontal="sm" paddingTop="sm">
              {activeTab === "itinerary" && <ItineraryEmptyState />}
            </Box>
          </ScrollView>
        </Box>
      </SafeAreaView>

      <TripReminderDateSheet
        bottomSheetRef={dateSheetRef}
        onSetDate={handleDateSet}
        onSkip={() => dateSheetRef.current?.close()}
        onDismiss={() => dateSheetRef.current?.close()}
      />

      <LocationOptionsSheet
        bottomSheetRef={locationSheetRef}
        locationDraft={locationDraft}
        onLocationDraftChange={setLocationDraft}
        onLocationConfirm={handleLocationConfirm}
        onVoteOnDestination={handleVoteOnDestination}
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
  coverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  coverImageFallback: {
    backgroundColor: ColorPalette.gray100,
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    marginTop: 120,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
    gap: 0,
  },
  tabBarContent: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
  },
  emptyStateText: {
    fontStyle: "italic",
  },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
});
