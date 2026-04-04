import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { Box, EmptyState, SkeletonRect, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useUser } from "@/contexts/user";
import { modelsEntityType } from "@/types/types.gen";
import type { ModelsActivity } from "@/types/types.gen";
import {
  activityHasMapLocation,
  encodeMapViewActivitiesParam,
} from "@/utils/map-view-activities";
import { router, useLocalSearchParams } from "expo-router";
import { MapPinned, MessageCircle, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { ActivityCard } from "./components/activity-card";
import {
  AddActivityEntrySheet,
  type AddActivityEntrySheetHandle,
} from "./components/add-activity-entry-sheet";
import {
  AddActivityManualSheet,
  type AddActivityManualSheetHandle,
} from "./components/add-activity-manual-sheet";

function ActivitiesSkeleton() {
  return (
    <Box gap="xs" paddingHorizontal="sm" paddingTop="sm">
      {[1, 2, 3].map((i) => (
        <SkeletonRect key={i} width="full" height="lg" borderRadius="sm" />
      ))}
    </Box>
  );
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const {
    id: tripID,
    locationName,
    locationLat,
    locationLng,
  } = useLocalSearchParams<{
    id: string;
    locationName?: string;
    locationLat?: string;
    locationLng?: string;
  }>();

  const entrySheetRef = useRef<AddActivityEntrySheetHandle>(null);
  const manualSheetRef = useRef<AddActivityManualSheetHandle>(null);

  // Consume location params returned from search-location modal
  useEffect(() => {
    if (locationName && locationLat && locationLng) {
      manualSheetRef.current?.setLocation({
        name: locationName,
        lat: parseFloat(locationLat),
        lng: parseFloat(locationLng),
      });
      router.setParams({
        locationName: undefined,
        locationLat: undefined,
        locationLng: undefined,
      });
      manualSheetRef.current?.open();
    }
  }, [locationName, locationLat, locationLng, router]);

  const { activities, isLoading, isLoadingMore, fetchMore, prependActivity } =
    useActivitiesList(tripID);

  const activitiesWithLocation = useMemo(
    () => activities.filter((a) => activityHasMapLocation(a)),
    [activities],
  );

  const { mutate: createActivity, isPending: isCreating } = useCreateActivity({
    mutation: {
      onSuccess: (data) => {
        if (data) prependActivity(data);
      },
    },
    [prependActivity],
  );

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivityAPIResponse }) => (
      <ActivityCard activity={item} />
    ),
    [],
  );

  const renderFooter = useCallback(
    () =>
      isLoadingMore ? (
        <Box paddingVertical="sm" alignItems="center">
          <ActivityIndicator size="small" />
        </Box>
      ) : null,
    [isLoadingMore],
  );

  return (
    <Box flex={1} backgroundColor="gray50">
      {isLoading ? (
        <ActivitiesSkeleton />
      ) : activities.length === 0 ? (
        <Box flex={1} alignItems="center" justifyContent="center">
          <EmptyState
            title="No activities yet"
            description="Add the first one!"
          />
        </Box>
      ) : (
        <>
          <Box paddingHorizontal="sm" paddingTop="xs" paddingBottom="xxs">
            <Text variant="bodyXsDefault" color="gray500">
              {activities.length}{" "}
              {activities.length === 1 ? "activity" : "activities"} added
            </Text>
          </Box>
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id ?? ""}
            renderItem={renderItem}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.list}
          />
        </>
      )}

      {/* Add an activity button */}
      <Pressable
        onPress={() => entrySheetRef.current?.open()}
        style={({ pressed }) => [
          styles.addButton,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap="xs"
          paddingVertical="sm"
          borderRadius="sm"
          style={styles.addButtonInner}
        >
          <Plus size={16} color={ColorPalette.gray500} />
          <Text variant="bodySmMedium" color="gray500">
            Add an activity
          </Text>
        </Box>
      </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/map-view",
                    params: {
                      activities: encodeMapViewActivitiesParam(activities),
                    },
                  })
                }
                disabled={activitiesWithLocation.length === 0}
                style={({ pressed }) => [
                  styles.mapButton,
                  activitiesWithLocation.length === 0 &&
                    styles.mapButtonDisabled,
                  pressed &&
                    activitiesWithLocation.length > 0 &&
                    styles.mapButtonPressed,
                ]}
              >
                <MapPinned size={18} color={ColorPalette.gray900} />
                <Text variant="bodySmMedium" color="gray900">
                  View on map
                </Text>
              </Pressable>

              {isLoading && (
                <Box alignItems="center" paddingVertical="md">
                  <Spinner />
                </Box>
              )}

              {!isLoading && activities.length === 0 && (
                <Box alignItems="center" paddingVertical="md">
                  <Text variant="bodySmDefault" color="gray500">
                    No activities yet
                  </Text>
                </Box>
              )}
            </Box>
          }
        />

        <CommentSection
          visible={!!activeActivityId}
          onClose={() => setActiveActivityId(null)}
          comments={comments}
          isLoading={isLoadingComments}
          isLoadingMore={isLoadingMoreComments}
          onLoadMore={fetchNextPage}
          currentUserId={currentUser?.id ?? ""}
          currentUserName={currentUser?.name ?? ""}
          currentUserAvatar={currentUser?.profile_picture}
          currentUserSeed={currentUser?.id}
          onSubmitComment={onSubmitComment}
          onReact={onReact}
        />
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    gap: Layout.spacing.xs,
  },
  addButton: {
    marginHorizontal: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  createButtonPressed: {
    opacity: 0.75,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ColorPalette.gray100,
  },
  mapButtonDisabled: {
    opacity: 0.45,
  },
  mapButtonPressed: {
    opacity: 0.75,
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: ColorPalette.gray50,
  },
});