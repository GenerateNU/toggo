import { useActivitiesListByCategory } from "@/api/activities/custom/useActivitiesListByCategory";
import { Box, EmptyState, Spinner, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { ActivityIndicator, Dimensions, StyleSheet, View } from "react-native";
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
  /**
   * Subscribe to the trip screen’s outer `ScrollView` scroll position so we can
   * paginate while this list is nested with `scrollEnabled={false}`.
   */
  onParentScroll?: (handler: (scrollY: number) => void) => () => void;
};

export const MoodBoardTabContent = forwardRef<
  MoodBoardTabContentHandle,
  MoodBoardTabContentProps
>(({ tripID, categoryName, onParentScroll }, ref) => {
  const router = useRouter();
  const noteRef = useRef<MoodBoardNoteSheetHandle>(null);
  const imageRef = useRef<MoodBoardImageSheetHandle>(null);
  const linkRef = useRef<MoodBoardLinkEntrySheetHandle>(null);
  const loadMoreSentinelRef = useRef<View>(null);
  const loadMoreThrottleRef = useRef(0);

  const {
    activities,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchMore,
    prependActivity,
  } = useActivitiesListByCategory(tripID, categoryName);

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

  const navigateToActivity = useCallback(
    (item: ModelsActivityAPIResponse) => {
      if (!item.id) return;
      router.push({
        pathname: `/trips/${tripID}/activities/${item.id}` as any,
        params: { tripID, source: "moodboard" },
      });
    },
    [router, tripID],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ModelsActivityAPIResponse>) => (
      <View style={styles.masonryCell} collapsable={false}>
        <MoodBoardCard
          tripID={tripID}
          activity={item}
          onPress={() => navigateToActivity(item)}
        />
      </View>
    ),
    [tripID, navigateToActivity],
  );

  const renderListFooter = useCallback(
    () => (
      <>
        <View
          ref={loadMoreSentinelRef}
          collapsable={false}
          style={styles.loadMoreSentinel}
        />
        {isLoadingMore ? (
          <Box paddingVertical="sm" alignItems="center" width="100%">
            <ActivityIndicator size="small" color={ColorPalette.gray500} />
          </Box>
        ) : null}
      </>
    ),
    [isLoadingMore],
  );

  const tryFetchMoreIfNearBottom = useCallback(() => {
    if (!hasNextPage || isLoadingMore) return;
    const now = Date.now();
    if (now - loadMoreThrottleRef.current < 320) return;
    loadMoreThrottleRef.current = now;
    loadMoreSentinelRef.current?.measureInWindow((_x, y, _w, h) => {
      const windowHeight = Dimensions.get("window").height;
      const nearBottom = y < windowHeight + 200;
      const notScrolledPast = y + h > -80;
      if (nearBottom && notScrolledPast) {
        fetchMore();
      }
    });
  }, [hasNextPage, isLoadingMore, fetchMore]);

  useEffect(() => {
    if (!onParentScroll) return;
    return onParentScroll(() => {
      tryFetchMoreIfNearBottom();
    });
  }, [onParentScroll, tryFetchMoreIfNearBottom]);

  useLayoutEffect(() => {
    if (sortedActivities.length === 0) return;
    const id = requestAnimationFrame(() => tryFetchMoreIfNearBottom());
    return () => cancelAnimationFrame(id);
  }, [sortedActivities.length, tryFetchMoreIfNearBottom]);

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
            style={styles.headerRow}
          >
            <Text variant="bodyDefault" color="gray500">
              {sortedActivities.length}{" "}
              {sortedActivities.length === 1 ? "post" : "posts"}
            </Text>
            <Text variant="bodyStrong" color="gray900">
              Newest first
            </Text>
          </Box>

          <FlashList
            data={sortedActivities}
            masonry
            numColumns={2}
            optimizeItemArrangement={false}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id ?? ""}
            renderItem={renderItem}
            ListFooterComponent={renderListFooter}
            onEndReached={hasNextPage ? fetchMore : undefined}
            onEndReachedThreshold={0.35}
            style={styles.flashList}
            contentContainerStyle={styles.flashListContent}
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
    </Box>
  );
});

MoodBoardTabContent.displayName = "MoodBoardTabContent";

const styles = StyleSheet.create({
  headerRow: {
    paddingTop: Layout.spacing.xs,
    paddingBottom: Layout.spacing.xxs,
  },
  /** Centers cards that use a fixed column width slightly narrower than FlashList’s half-row. */
  masonryCell: {
    width: "100%",
    alignItems: "center",
  },
  flashList: {
    width: "100%",
  },
  flashListContent: {
    paddingBottom: Layout.spacing.md,
  },
  loadMoreSentinel: {
    height: 1,
    width: "100%",
    marginTop: Layout.spacing.xs,
  },
});
