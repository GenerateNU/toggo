import { useActivitiesList } from "@/api/activities/custom/useActivitiesList";
import { Box, EmptyState, SkeletonRect, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type {
  ModelsActivityAPIResponse,
  ModelsParsedActivityData,
} from "@/types/types.gen";
import { useLocalSearchParams } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { ActivityCard } from "../components/activity-card";
import {
  AddActivityEntrySheet,
  type AddActivityEntrySheetHandle,
} from "../components/add-activity-entry-sheet";
import {
  AddActivityManualSheet,
  type AddActivityManualSheetHandle,
} from "../components/add-activity-manual-sheet";

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
  const {
    id: tripID,
  } = useLocalSearchParams<{
    id: string;
    locationName?: string;
    locationLat?: string;
    locationLng?: string;
  }>();

  const entrySheetRef = useRef<AddActivityEntrySheetHandle>(null);
  const manualSheetRef = useRef<AddActivityManualSheetHandle>(null);

  const { activities, isLoading, isLoadingMore, fetchMore, prependActivity } =
    useActivitiesList(tripID);

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

      <AddActivityEntrySheet
        ref={entrySheetRef}
        tripID={tripID ?? ""}
        onManual={handleManual}
        onAutofilled={handleAutofilled}
        onClose={() => entrySheetRef.current?.close()}
      />

      <AddActivityManualSheet
        ref={manualSheetRef}
        tripID={tripID ?? ""}
        onSaved={handleSaved}
        onClose={() => manualSheetRef.current?.close()}
      />
    </Box>
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
  addButtonInner: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ColorPalette.gray300,
    backgroundColor: ColorPalette.gray50,
  },
});