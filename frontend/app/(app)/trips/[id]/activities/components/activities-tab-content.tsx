import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { Box, Button, EmptyState, SkeletonRect, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type {
    ModelsActivityAPIResponse,
    ModelsParsedActivityData,
} from "@/types/types.gen";
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

  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const { activities, isLoading, isLoadingMore, fetchMore, prependActivity } =
    useActivitiesList(tripID);

  // ─── Sort activities ─────────────────────────────────────────────────────

  const sortedActivities = useMemo(() => {
    if (sortOrder === "newest") return activities;
    return [...activities].reverse();
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

  const renderItem = useCallback(
    ({ item }: { item: ModelsActivityAPIResponse }) => (
      <ActivityCard
        activity={item}
        onPress={() =>
          router.push({
            // TODO: update pathname to match your file structure once the detail
            // screen is finalized — currently wired to the temp ActivityDetail page
            pathname: `/trips/${tripID}/activities/${item.id}` as any,
            params: { tripID },
          })
        }
      />
    ),
    [tripID],
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
    <Box flex={1} backgroundColor="gray25">
      {isLoading ? (
        <ActivitiesSkeleton />
      ) : activities.length === 0 ? (
        <Box alignItems="center" justifyContent="center" paddingVertical="xl">
          <EmptyState
            title="No activities yet"
            description="Tap + to add the first one!"
          />
        </Box>
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
        </>
      )}

      {/* Add an activity button */}
      <Box style={styles.addButton}>
        <Button
          layout="textOnly"
          label="Add an activity"
          variant="Secondary"
          onPress={() => entrySheetRef.current?.open()}
        />
      </Box>

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
    backgroundColor: ColorPalette.gray25,
  },
  list: {
    paddingBottom: Layout.spacing.xs,
  },
  separator: {
    height: Layout.spacing.sm,
    backgroundColor: ColorPalette.gray25,
  },
  addButton: {
    marginTop: Layout.spacing.xs,
  },
});