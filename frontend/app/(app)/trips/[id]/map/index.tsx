import { useGetActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { BottomSheet, Box, ErrorState, Spinner, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import { computeMapCameraForActivities } from "@/utils/map-view-activities";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { BackButton } from "@/design-system/components/navigation/arrow";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ActivityMapPin } from "./components/map-pin";
import { MapLocationDetailSheetContent } from "./components/map-location-detail-sheet";
import { MapLocationListSheetContent } from "./components/map-location-list-sheet";
import {
  toTripMapActivity,
  type MapCategoryFilter,
  type TripMapActivity,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_ZOOM = 11;
const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749];
const ACTIVITIES_FETCH_LIMIT = 100;

/** List sheet snap points: peek (38%) and fully expanded (82%). */
const LIST_SNAP_POINTS: (string | number)[] = ["38%", "82%"];
/** Detail sheet: fixed height avoids dynamic-sizing measurement delay. */
const DETAIL_SNAP_POINTS: (string | number)[] = ["55%"];

/** Vertical offset of the floating back button below the safe-area top. */
const BACK_BUTTON_TOP_OFFSET = Layout.spacing.md;
/** Vertical offset of the loading badge below the safe-area top. */
const LOADING_BADGE_TOP_OFFSET = Layout.spacing.xl + Layout.spacing.md;

const CAMERA_PADDING = {
  paddingTop: Layout.spacing.xl,
  paddingBottom: Layout.spacing.xl + Layout.spacing.xl,
  paddingLeft: Layout.spacing.md,
  paddingRight: Layout.spacing.md,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pinAnnotationId(activity: TripMapActivity): string {
  return `trip-map-pin-${activity.id}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TripMapScreen() {
  const insets = useSafeAreaInsets();
  const { id: tripID } = useLocalSearchParams<{ id: string }>();

  const listSheetRef = useRef<BottomSheetMethods | null>(null);
  const detailSheetRef = useRef<BottomSheetMethods | null>(null);

  const [selectedActivity, setSelectedActivity] =
    useState<TripMapActivity | null>(null);
  const [selectedFilter, setSelectedFilter] =
    useState<MapCategoryFilter>("all");

  const { data, isLoading, isError } = useGetActivitiesByTripID(
    tripID ?? "",
    { limit: ACTIVITIES_FETCH_LIMIT },
    { query: { enabled: !!tripID } },
  );

  const mapActivities = useMemo<TripMapActivity[]>(() => {
    const items = data?.items ?? [];
    return items
      .map(toTripMapActivity)
      .filter((a): a is TripMapActivity => a !== null);
  }, [data]);

  const cameraConfig = useMemo(
    () => computeMapCameraForActivities(mapActivities),
    [mapActivities],
  );

  // Open the detail sheet whenever a new activity is selected.
  // Using fixed snapPoints on the detail sheet (not dynamic sizing) means we can
  // snapToIndex immediately without waiting for content measurement.
  useEffect(() => {
    if (selectedActivity) {
      detailSheetRef.current?.snapToIndex(0);
    } else {
      detailSheetRef.current?.close();
    }
  }, [selectedActivity]);

  const handleActivityOpen = (activity: TripMapActivity) => {
    setSelectedActivity(activity);
    // Collapse list to peek so the detail sheet is clearly visible on top
    listSheetRef.current?.snapToIndex(0);
  };

  const handleDetailClose = () => {
    setSelectedActivity(null);
  };

  const handleDetailSheetChange = (index: number) => {
    if (index < 0) {
      setSelectedActivity(null);
    }
  };

  const handleViewActivity = (activityId: string) => {
    router.push(`/trips/${tripID}/activities/${activityId}` as any);
  };

  const camera = useMemo(() => {
    if (!cameraConfig) {
      return (
        <Camera
          centerCoordinate={DEFAULT_CENTER}
          zoomLevel={DEFAULT_ZOOM}
          animationMode="flyTo"
          animationDuration={600}
        />
      );
    }
    if (cameraConfig.mode === "center") {
      return (
        <Camera
          centerCoordinate={cameraConfig.coordinate}
          zoomLevel={cameraConfig.zoomLevel}
          animationMode="flyTo"
          animationDuration={600}
        />
      );
    }
    return (
      <Camera
        bounds={{ ne: cameraConfig.ne, sw: cameraConfig.sw }}
        padding={CAMERA_PADDING}
        animationMode="flyTo"
        animationDuration={600}
      />
    );
  }, [cameraConfig]);

  if (!tripID) return null;

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ErrorState
          title="Couldn't load map"
          description="There was a problem loading activities for this trip. Please try again."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Map */}
      <MapView
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={true}
      >
        {camera}
        {mapActivities.map((activity) => (
          <PointAnnotation
            key={pinAnnotationId(activity)}
            id={pinAnnotationId(activity)}
            coordinate={[activity.location_lng, activity.location_lat]}
            onSelected={() => handleActivityOpen(activity)}
          >
            <ActivityMapPin
              activity={activity}
              isSelected={selectedActivity?.id === activity.id}
            />
          </PointAnnotation>
        ))}
      </MapView>

      {/* Floating back button */}
      <View
        style={{
          position: "absolute",
          left: Layout.screen.horizontalPadding,
          top: insets.top + BACK_BUTTON_TOP_OFFSET,
        }}
      >
        <BackButton hasBackground />
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View
          style={[
            styles.loadingOverlay,
            { top: insets.top + LOADING_BADGE_TOP_OFFSET },
          ]}
        >
          <Box
            backgroundColor="white"
            padding="xs"
            borderRadius="md"
            style={styles.loadingBadge}
          >
            <Spinner size={CoreSize.iconSm} />
          </Box>
        </View>
      )}

      {/* List sheet — always visible; no backdrop so the map stays unobscured */}
      <BottomSheet
        ref={listSheetRef}
        snapPoints={LIST_SNAP_POINTS}
        initialIndex={0}
        disableClose={true}
        disableBackdrop={true}
        disableScrollView={false}
      >
        {mapActivities.length === 0 && !isLoading ? (
          <Box padding="md" alignItems="center">
            <Text variant="bodySmDefault" color="gray500">
              No activities with a location on this trip.
            </Text>
          </Box>
        ) : (
          <MapLocationListSheetContent
            activities={mapActivities}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            onActivityPress={handleActivityOpen}
          />
        )}
      </BottomSheet>

      {/* Detail sheet — slides in on top of the list when an activity is selected.
          Fixed snapPoints avoids measurement timing issues. */}
      <BottomSheet
        ref={detailSheetRef}
        snapPoints={DETAIL_SNAP_POINTS}
        initialIndex={-1}
        disableScrollView={true}
        disableBackdrop={true}
        onChange={handleDetailSheetChange}
      >
        {selectedActivity ? (
          <MapLocationDetailSheetContent
            activity={selectedActivity}
            onClose={handleDetailClose}
            onViewActivity={handleViewActivity}
          />
        ) : (
          <Box minHeight={Layout.spacing.xl} />
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorPalette.gray50,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    right: Layout.screen.horizontalPadding,
  },
  loadingBadge: {
    ...Elevation.sm,
  },
});
