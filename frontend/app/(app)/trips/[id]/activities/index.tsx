import { useCreateActivity } from "@/api/activities";
import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { Box, Screen, Text } from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import { useUser } from "@/contexts/user";
import { modelsEntityType } from "@/types/types.gen";
import type { ModelsActivity } from "@/types/types.gen";
import { useLocalSearchParams } from "expo-router";
import { MessageCircle, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";

// ─── Component ───────────────────────────────────────────────────────────────

export default function Activities() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useUser();

  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);

  const { activities, isLoading, isLoadingMore, fetchMore, prependActivity } =
    useActivitiesList(tripID);

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
          <ActivityIndicator size="small" color={ColorPalette.textSubtle} />
        </Box>
      ) : null,
    [isLoadingMore],
  );

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivity }) => (
      <Box
        backgroundColor="backgroundCard"
        borderRadius="md"
        padding="md"
        gap="sm"
        marginHorizontal="sm"
      >
        <Text variant="headingSm" color="textInverse" numberOfLines={1}>
          {item.name ?? "Unnamed Activity"}
        </Text>
        {item.description ? (
          <Text variant="bodySmDefault" color="textSubtle" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <Box height={1} backgroundColor="borderSubtle" />

        <Pressable
          onPress={() => setActiveActivityId(item.id ?? null)}
          style={({ pressed }) => [
            styles.commentButton,
            pressed && styles.commentButtonPressed,
          ]}
          accessibilityLabel="Open comments"
        >
          <MessageCircle size={16} color={ColorPalette.textSubtle} />
          <Text variant="bodyXsMedium" color="textSubtle">
            Comments
          </Text>
        </Pressable>
      </Box>
    ),
    [],
  );

  return (
    <Screen>
      <Box flex={1} backgroundColor="backgroundSubtle">
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
                backgroundColor="backgroundCard"
                gap="xs"
              >
                <Text variant="headingMd" color="textInverse">
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
                  <ActivityIndicator
                    size="small"
                    color={ColorPalette.textInverse}
                  />
                ) : (
                  <Plus size={18} color={ColorPalette.textInverse} />
                )}
                <Text variant="bodySmMedium" color="textInverse">
                  Create Activity
                </Text>
              </Pressable>

              {isLoading && (
                <Box alignItems="center" paddingVertical="md">
                  <ActivityIndicator color={ColorPalette.textSubtle} />
                </Box>
              )}

              {!isLoading && activities.length === 0 && (
                <Box alignItems="center" paddingVertical="md">
                  <Text variant="bodySmDefault" color="textSubtle">
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
          currentUserName={currentUser?.username ?? currentUser?.name ?? ""}
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
    backgroundColor: ColorPalette.brandPrimary,
  },
  createButtonPressed: {
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
    backgroundColor: ColorPalette.backgroundSubtle,
  },
  commentButtonPressed: {
    opacity: 0.7,
  },
});
