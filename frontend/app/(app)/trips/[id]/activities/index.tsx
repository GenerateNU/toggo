import { useCreateActivity } from "@/api/activities";
import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useUser } from "@/contexts/user";
import { Box, Screen, Spinner, Text } from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import type { ModelsActivity } from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import {
  activityHasMapLocation,
  encodeMapViewActivitiesParam,
} from "@/utils/map-view-activities";
import { router, useLocalSearchParams } from "expo-router";
import { MapPinned, MessageCircle, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

// ─── Component ───────────────────────────────────────────────────────────────

export default function Activities() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useUser();

  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);

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
  });

  const handleCreateActivity = () => {
    if (!tripID) return;
    const count = activities.length + 1;
    createActivity({
      tripID,
      data: {
        name: `Test Activity ${count}`,
        description: "Created for comment testing",
      },
    });
  };

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
    entityID: activeActivityId ?? "",
    enabled: !!activeActivityId && !!tripID,
  });

  const renderFooter = useCallback(
    () =>
      isLoadingMore ? (
        <Box paddingVertical="sm" alignItems="center">
          <Spinner />
        </Box>
      ) : null,
    [isLoadingMore],
  );

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivity }) => (
      <Box
        backgroundColor="white"
        borderRadius="md"
        padding="md"
        gap="sm"
        marginHorizontal="sm"
      >
        <Text variant="headingSm" color="gray900" numberOfLines={1}>
          {item.name ?? "Unnamed Activity"}
        </Text>
        {item.description ? (
          <Text variant="bodySmDefault" color="gray500" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <Box height={1} backgroundColor="gray100" />

        <Pressable
          onPress={() => setActiveActivityId(item.id ?? null)}
          style={({ pressed }) => [
            styles.commentButton,
            pressed && styles.commentButtonPressed,
          ]}
          accessibilityLabel="Open comments"
        >
          <MessageCircle size={16} color={ColorPalette.gray500} />
          <Text variant="bodyXsMedium" color="gray500">
            Comments
          </Text>
        </Pressable>
      </Box>
    ),
    [],
  );

  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id ?? ""}
          renderItem={renderItem}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Box gap="sm">
              <Box
                padding="lg"
                paddingTop="xl"
                backgroundColor="white"
                gap="xs"
              >
                <Text variant="headingMd" color="gray900">
                  Activities
                </Text>
              </Box>

              <Pressable
                onPress={handleCreateActivity}
                disabled={isCreating || !tripID}
                style={({ pressed }) => [
                  styles.createButton,
                  (pressed || isCreating) && styles.createButtonPressed,
                ]}
              >
                {isCreating ? (
                  <Spinner />
                ) : (
                  <Plus size={18} color={ColorPalette.gray900} />
                )}
                <Text variant="bodySmMedium" color="gray900">
                  Create Activity
                </Text>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ColorPalette.brand500,
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
  commentButtonPressed: {
    opacity: 0.7,
  },
});