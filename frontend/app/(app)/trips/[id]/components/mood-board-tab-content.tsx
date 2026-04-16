import { useActivitiesListByCategory } from "@/api/activities/custom/useActivitiesListByCategory";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useUser } from "@/contexts/user";
import { Box, EmptyState, Spinner, Text } from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { MoodBoardCard } from "./mood-board-card";
import {
  MoodBoardImageSheet,
  type MoodBoardImageSheetHandle,
} from "./mood-board-image-sheet";
import {
  MoodBoardLinkEntrySheet,
  type MoodBoardLinkEntrySheetHandle,
} from "./mood-board-link-entry-sheet";
import {
  MoodBoardNoteSheet,
  type MoodBoardNoteSheetHandle,
} from "./mood-board-note-sheet";

export type MoodBoardTabContentHandle = {
  openAddNote: () => void;
  openAddImage: () => void;
  openAddLink: () => void;
};

type MoodBoardTabContentProps = {
  tripID: string;
  categoryName: string;
};

export const MoodBoardTabContent = forwardRef<
  MoodBoardTabContentHandle,
  MoodBoardTabContentProps
>(({ tripID, categoryName }, ref) => {
  const { currentUser } = useUser();
  const [activeActivityId, setActiveActivityId] = useState<string | null>(
    null,
  );

  const noteRef = useRef<MoodBoardNoteSheetHandle>(null);
  const imageRef = useRef<MoodBoardImageSheetHandle>(null);
  const linkRef = useRef<MoodBoardLinkEntrySheetHandle>(null);

  const { activities, isLoading, isLoadingMore, fetchMore, prependActivity } =
    useActivitiesListByCategory(tripID, categoryName);

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return tb - ta;
    });
  }, [activities]);

  useImperativeHandle(ref, () => ({
    openAddNote: () => noteRef.current?.open(),
    openAddImage: () => imageRef.current?.open(),
    openAddLink: () => linkRef.current?.open(),
  }));

  const handleSaved = useCallback(
    (activity: ModelsActivityAPIResponse) => {
      prependActivity(activity);
    },
    [prependActivity],
  );

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID,
    entityType: modelsEntityType.ActivityEntity,
    entityID: activeActivityId ?? "",
    enabled: !!activeActivityId,
  });

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivityAPIResponse }) => (
      <MoodBoardCard
        activity={item}
        onPress={() => setActiveActivityId(item.id ?? null)}
      />
    ),
    [],
  );

  const renderFooter = useCallback(
    () =>
      isLoadingMore ? (
        <Box paddingVertical="sm" alignItems="center" width="100%">
          <ActivityIndicator size="small" color={ColorPalette.gray500} />
        </Box>
      ) : null,
    [isLoadingMore],
  );

  if (isLoading) {
    return (
      <Box paddingVertical="xl" alignItems="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <Box flex={1} gap="sm">
      {sortedActivities.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Tap + to add a note, photo, or link."
        />
      ) : (
        <>
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingBottom="xs"
          >
            <Text variant="bodyDefault" color="gray500">
              {sortedActivities.length}{" "}
              {sortedActivities.length === 1 ? "post" : "posts"}
            </Text>
            <Text variant="bodySmStrong" color="gray700">
              Newest first
            </Text>
          </Box>

          <FlatList
            data={sortedActivities}
            keyExtractor={(item) => item.id ?? ""}
            numColumns={2}
            renderItem={renderItem}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.35}
            ListFooterComponent={renderFooter}
            scrollEnabled={false}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      <MoodBoardNoteSheet
        ref={noteRef}
        tripID={tripID}
        categoryName={categoryName}
        onSaved={handleSaved}
      />
      <MoodBoardImageSheet
        ref={imageRef}
        tripID={tripID}
        categoryName={categoryName}
        onSaved={handleSaved}
      />
      <MoodBoardLinkEntrySheet
        ref={linkRef}
        tripID={tripID}
        categoryName={categoryName}
        onSaved={handleSaved}
        onClose={() => {}}
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
  );
});

MoodBoardTabContent.displayName = "MoodBoardTabContent";

const styles = StyleSheet.create({
  column: {
    gap: Layout.spacing.sm,
  },
  listContent: {
    paddingBottom: Layout.spacing.md,
  },
});
