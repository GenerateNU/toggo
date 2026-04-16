import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { usePostApiV1TripsTripidActivitiesActivityidRsvp } from "@/api/activities/usePostApiV1TripsTripidActivitiesActivityidRsvp";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useGetImage } from "@/api/files/custom/useGetImage";
import { useUser } from "@/contexts/user";
import {
  Box,
  Button,
  EmptyState,
  SkeletonRect,
  Spinner,
  Text,
  useToast,
} from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type {
  ModelsActivityAPIResponse,
  ModelsParsedActivityData,
} from "@/types/types.gen";
import { modelsEntityType, modelsRSVPStatus } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { ActivityCard } from "./activity-card";
import {
  AddActivityEntrySheet,
  type AddActivityEntrySheetHandle,
} from "./add-activity-entry-sheet";
import {
  AddActivityManualSheet,
  type AddActivityManualSheetHandle,
} from "./add-activity-manual-sheet";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivitiesTabContentHandle = {
  openAddActivity: () => void;
};

type ActivitiesTabContentProps = {
  tripID: string;
};

type SortOrder = "newest" | "oldest";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ActivitiesSkeleton() {
  return (
    <Box gap="xs" paddingTop="sm">
      {[1, 2, 3].map((i) => (
        <SkeletonRect key={i} width="full" height="lg" borderRadius="sm" />
      ))}
    </Box>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ActivitiesTabContent = forwardRef<
  ActivitiesTabContentHandle,
  ActivitiesTabContentProps
>(({ tripID }, ref) => {
  const entrySheetRef = useRef<AddActivityEntrySheetHandle>(null);
  const manualSheetRef = useRef<AddActivityManualSheetHandle>(null);
  const toast = useToast();

  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [activeCommentActivityId, setActiveCommentActivityId] = useState<
    string | null
  >(null);

  const rsvpMutation = usePostApiV1TripsTripidActivitiesActivityidRsvp();

  const { currentUser } = useUser();
  const { data: currentUserProfileImages } = useGetImage(
    [currentUser?.profile_picture],
    "small",
  );
  const currentUserProfilePhotoUrl = currentUserProfileImages?.[0]?.url;

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID: tripID ?? "",
    entityType: modelsEntityType.ActivityEntity,
    entityID: activeCommentActivityId ?? "",
    enabled: !!activeCommentActivityId && !!tripID,
  });

  const { activities, isLoading, isLoadingMore, fetchMore, prependActivity } =
    useActivitiesList(tripID);

  // ─── Sort activities ─────────────────────────────────────────────────────

  const sortedActivities = useMemo(() => {
    const nonHousing = activities.filter(
      (a) => !a.category_names?.includes("housing"),
    );
    if (sortOrder === "newest") return nonHousing;
    return [...nonHousing].reverse();
  }, [activities, sortOrder]);

  // ─── Expose open method for CreateFAB ────────────────────────────────────

  useImperativeHandle(ref, () => ({
    openAddActivity: () => entrySheetRef.current?.open(),
  }));

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAutofilled = useCallback((data: ModelsParsedActivityData) => {
    entrySheetRef.current?.close();
    setTimeout(() => manualSheetRef.current?.open(data), 300);
  }, []);

  const handleManual = useCallback(() => {
    entrySheetRef.current?.close();
    setTimeout(() => manualSheetRef.current?.open(), 300);
  }, []);

  const handleSaved = useCallback(
    (activity: ModelsActivityAPIResponse) => {
      manualSheetRef.current?.close();
      prependActivity(activity);
    },
    [prependActivity],
  );

  const toggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  }, []);

  const queryClient = useQueryClient();

  const handleRsvp = useCallback(
    async (item: ModelsActivityAPIResponse) => {
      if (!tripID || !item.id) return;
      const isGoing = (item.going_users ?? []).some(
        (u) => u.user_id === currentUser?.id,
      );
      try {
        await rsvpMutation.mutateAsync({
          tripID,
          activityID: item.id,
          data: {
            status: isGoing
              ? modelsRSVPStatus.RSVPStatusNotGoing
              : modelsRSVPStatus.RSVPStatusGoing,
          },
        });
        // Invalidate the activities list so going_users refreshes
        queryClient.invalidateQueries({
          predicate: (query) =>
            JSON.stringify(query.queryKey).includes("activities"),
        });
      } catch {
        toast.show({ message: "Couldn't update RSVP. Try again." });
      }
    },
    [tripID, currentUser?.id, rsvpMutation, toast, queryClient],
  );

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivityAPIResponse }) => (
      <ActivityCard
        activity={item}
        onPress={() =>
          router.push({
            pathname: `/trips/${tripID}/activities/${item.id}` as any,
            params: { tripID },
          })
        }
        onOpenComments={() => setActiveCommentActivityId(item.id ?? null)}
        isGoing={(item.going_users ?? []).some(
          (u) => u.user_id === currentUser?.id,
        )}
        onRsvp={() => handleRsvp(item)}
      />
    ),
    [tripID, currentUser?.id, handleRsvp],
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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Box flex={1}>
      {isLoading ? (
        <Box
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingVertical="xl"
        >
          <Spinner />
        </Box>
      ) : activities.length === 0 ? (
        <>
          <Box alignItems="center" justifyContent="center" paddingVertical="xl">
            <EmptyState
              title="No activities yet"
              description="Tap + to add the first one!"
            />
          </Box>
          <Box style={styles.addButton}>
            <Button
              layout="textOnly"
              label="Add an activity"
              variant="Secondary"
              onPress={() => entrySheetRef.current?.open()}
            />
          </Box>
        </>
      ) : (
        <>
          {/* Header row: count + sort toggle */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            style={styles.headerRow}
          >
            <Text variant="bodyDefault" color="gray500">
              {activities.length}{" "}
              {activities.length === 1 ? "option" : "options"} added
            </Text>
            <Pressable
              onPress={toggleSort}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text variant="bodyStrong" color="gray900">
                {sortOrder === "newest" ? "Newest first" : "Oldest first"}
              </Text>
            </Pressable>
          </Box>

          <FlatList
            data={sortedActivities}
            keyExtractor={(item) => item.id ?? ""}
            renderItem={renderItem}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            style={styles.flatList}
            scrollEnabled={false}
          />
          <Box style={styles.addButton}>
            <Button
              layout="textOnly"
              label="Add an activity"
              variant="Secondary"
              onPress={() => entrySheetRef.current?.open()}
            />
          </Box>
        </>
      )}

      <AddActivityEntrySheet
        ref={entrySheetRef}
        tripID={tripID}
        onManual={handleManual}
        onAutofilled={handleAutofilled}
        onClose={() => entrySheetRef.current?.close()}
      />

      <AddActivityManualSheet
        ref={manualSheetRef}
        tripID={tripID}
        onSaved={handleSaved}
        onClose={() => manualSheetRef.current?.close()}
      />

      <CommentSection
        visible={!!activeCommentActivityId}
        onClose={() => setActiveCommentActivityId(null)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={currentUser?.id ?? ""}
        currentUserName={currentUser?.name ?? ""}
        currentUserAvatar={currentUserProfilePhotoUrl}
        currentUserSeed={currentUser?.id}
        onSubmitComment={onSubmitComment}
        onReact={onReact}
      />
    </Box>
  );
});

ActivitiesTabContent.displayName = "ActivitiesTabContent";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    paddingTop: Layout.spacing.xs,
    paddingBottom: Layout.spacing.xxs,
  },
  flatList: {
    backgroundColor: ColorPalette.gray50,
  },
  list: {
    paddingBottom: Layout.spacing.xs,
  },
  separator: {
    height: Layout.spacing.sm,
    backgroundColor: ColorPalette.gray50,
  },
  addButton: {
    marginTop: Layout.spacing.xs,
  },
});
