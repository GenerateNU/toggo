import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useGetImage } from "@/api/files/custom/useGetImage";
import { useUser } from "@/contexts/user";
import {
  Box,
  EmptyState,
  Spinner,
  Text,
} from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type {
  ModelsActivityAPIResponse,
  ModelsParsedActivityData,
} from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import { router } from "expo-router";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import {
  AddHousingEntrySheet,
  type AddHousingEntrySheetHandle,
} from "./add-housing-entry-sheet";
import {
  AddHousingManualSheet,
  type AddHousingManualSheetHandle,
} from "./add-housing-manual-sheet";
import { HousingCard } from "./housing-card";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HousingTabContentHandle = {
  openAddHousing: () => void;
};

type HousingTabContentProps = {
  tripID: string;
};

type SortOrder = "newest" | "oldest";

// ─── Skeleton ────────────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export const HousingTabContent = forwardRef<
  HousingTabContentHandle,
  HousingTabContentProps
>(({ tripID }, ref) => {
  const entrySheetRef = useRef<AddHousingEntrySheetHandle>(null);
  const manualSheetRef = useRef<AddHousingManualSheetHandle>(null);

  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [activeCommentHousingId, setActiveCommentHousingId] = useState<
    string | null
  >(null);

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
    entityID: activeCommentHousingId ?? "",
    enabled: !!activeCommentHousingId && !!tripID,
  });

  const {
    activities: housingOptions,
    isLoading,
    isLoadingMore,
    fetchMore,
    prependActivity: prependHousing,
  } = useActivitiesList(tripID, "housing");

  // ─── Sort ─────────────────────────────────────────────────────────────────

  const sortedOptions = useMemo(() => {
    if (sortOrder === "newest") return housingOptions;
    return [...housingOptions].reverse();
  }, [housingOptions, sortOrder]);

  // ─── Expose open method for CreateFAB ────────────────────────────────────

  useImperativeHandle(ref, () => ({
    openAddHousing: () => entrySheetRef.current?.open(),
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
    (housing: ModelsActivityAPIResponse) => {
      manualSheetRef.current?.close();
      prependHousing(housing);
    },
    [prependHousing],
  );

  const toggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivityAPIResponse }) => (
      <HousingCard
        housing={item}
        onPress={() =>
          router.push({
            pathname: `/trips/${tripID}/housing/${item.id}` as any,
            params: { tripID },
          })
        }
        onOpenComments={() => setActiveCommentHousingId(item.id ?? null)}
      />
    ),
    [tripID],
  );

  const renderFooter = useCallback(
    () =>
      isLoadingMore ? (
        <Box paddingVertical="sm" alignItems="center">
          <Spinner />
        </Box>
      ) : null,
    [isLoadingMore],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Box flex={1}>
      {isLoading ? (
        <Box alignItems="center" paddingVertical="xl">
          <Spinner />
        </Box>
      ) : housingOptions.length === 0 ? (
        <Box alignItems="center" justifyContent="center" paddingVertical="xl">
          <EmptyState
            title="No housing options yet"
            description="Tap + to add the first one!"
          />
        </Box>
      ) : (
        <>
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            style={styles.headerRow}
          >
            <Text variant="bodyDefault" color="gray500">
              {housingOptions.length}{" "}
              {housingOptions.length === 1 ? "option" : "options"} added
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
            data={sortedOptions}
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
        </>
      )}

      <AddHousingEntrySheet
        ref={entrySheetRef}
        tripID={tripID}
        onManual={handleManual}
        onAutofilled={handleAutofilled}
        onClose={() => entrySheetRef.current?.close()}
      />

      <AddHousingManualSheet
        ref={manualSheetRef}
        tripID={tripID}
        onSaved={handleSaved}
        onClose={() => manualSheetRef.current?.close()}
      />

      <CommentSection
        visible={!!activeCommentHousingId}
        onClose={() => setActiveCommentHousingId(null)}
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

HousingTabContent.displayName = "HousingTabContent";

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
});
