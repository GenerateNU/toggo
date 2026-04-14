import { useUser } from "@/contexts/user";
import {
  BottomSheet,
  Box,
  Button,
  ErrorState,
  Icon,
  Screen,
  Text,
  useToast,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import {
  computeMapCameraForActivities,
  formatMapViewActivityScheduleLine,
  resolveMapViewActivitiesInput,
  type MapViewActivityForMap,
} from "@/utils/map-view-activities";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, MapPin } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_ZOOM = 11;
/** MapLibre uses [longitude, latitude]. Shown when no activity locations are passed. */
const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749];
const DEFAULT_LABEL = "San Francisco";

const DETAIL_SHEET_SNAP_POINTS = ["48%", "78%"] as const;
const ACTIVITY_IMAGE_SIZE = Layout.grid.base * 14;

const DEFAULT_PIN_DETAIL: MapViewActivityForMap = {
  id: "default-map-placeholder",
  name: DEFAULT_LABEL,
  location_lat: DEFAULT_CENTER[1],
  location_lng: DEFAULT_CENTER[0],
  location_name: DEFAULT_LABEL,
  description:
    "Development preview center. Open the map from trip activities to see real pins.",
};

const CAMERA_PADDING = {
  paddingTop: Layout.spacing.xl + 24,
  paddingBottom: Layout.spacing.xl + 40,
  paddingLeft: Layout.spacing.md,
  paddingRight: Layout.spacing.md,
};

function activityAnnotationId(item: MapViewActivityForMap, index: number) {
  if (item.id) return `activity-pin-${item.id}`;
  return `activity-pin-${index}-${item.location_lat}-${item.location_lng}`;
}

function formatActivityLocationLine(activity: MapViewActivityForMap): string {
  const name = activity.location_name?.trim();
  if (name) return name;
  return `${activity.location_lat.toFixed(4)}, ${activity.location_lng.toFixed(4)}`;
}

function ActivityDetailSheetBody({
  activity,
  providerLabel,
  onOpenDirections,
}: {
  activity: MapViewActivityForMap;
  providerLabel: string;
  onOpenDirections: () => void;
}) {
  const imageUri = activity.thumbnail_url ?? activity.media_url;
  const scheduleLine = formatMapViewActivityScheduleLine(activity);

  return (
    <Pressable onPress={onOpenDirections}>
      <Box padding="lg" gap="md">
      <Box flexDirection="row" gap="md" alignItems="flex-start">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.activityImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Box
            width={ACTIVITY_IMAGE_SIZE}
            height={ACTIVITY_IMAGE_SIZE}
            borderRadius="md"
            backgroundColor="gray100"
            alignItems="center"
            justifyContent="center"
          >
            <Icon icon={MapPin} size="md" color="gray400" />
          </Box>
        )}
        <Box flex={1} gap="xs">
          <Text variant="headingSm" color="gray900" numberOfLines={2}>
            {activity.name}
          </Text>
          <Text variant="bodySmDefault" color="gray500" numberOfLines={3}>
            {formatActivityLocationLine(activity)}
          </Text>
          {scheduleLine ? (
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon icon={Calendar} size="xs" color="gray400" />
              <Text
                variant="bodyXsDefault"
                color="gray500"
                style={styles.scheduleText}
              >
                {scheduleLine}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Box>
      <Text variant="bodyDefault" color="gray600">
        {activity.description?.trim()
          ? activity.description.trim()
          : "No description for this activity yet."}
      </Text>
      <Button
        layout="textOnly"
        variant="Primary"
        label={`Open in ${providerLabel}`}
        onPress={onOpenDirections}
      />
    </Box>
    </Pressable>
  );
}

type MapProvider = "apple" | "google";

function resolveProvider(
  appleEnabled?: boolean,
  googleEnabled?: boolean,
): MapProvider {
  if (appleEnabled && googleEnabled) {
    return Platform.OS === "ios" ? "apple" : "google";
  }
  if (appleEnabled) return "apple";
  if (googleEnabled) return "google";
  return Platform.OS === "ios" ? "apple" : "google";
}

export default function MapViewScreen() {
  const { currentUser } = useUser();
  const toast = useToast();
  const { activities: activitiesParam } = useLocalSearchParams<{
    activities?: string;
  }>();

  const detailSheetRef = useRef<BottomSheetMethods | null>(null);
  const [selectedActivity, setSelectedActivity] =
    useState<MapViewActivityForMap | null>(null);

  const input = useMemo(
    () => resolveMapViewActivitiesInput(activitiesParam),
    [activitiesParam],
  );

  const activityItems = useMemo(
    () => (input.kind === "activities" ? input.items : []),
    [input],
  );

  const cameraConfig = useMemo(
    () => computeMapCameraForActivities(activityItems),
    [activityItems],
  );

  useEffect(() => {
    if (selectedActivity) {
      const id = requestAnimationFrame(() => {
        detailSheetRef.current?.snapToIndex(0);
      });
      return () => cancelAnimationFrame(id);
    }
    detailSheetRef.current?.close();
  }, [selectedActivity]);

  if (input.kind === "error") {
    return (
      <Box flex={1} backgroundColor="gray50" justifyContent="center">
        <ErrorState title="Map couldn’t load" description={input.message} />
        <Box paddingHorizontal="lg">
          <Button
            layout="textOnly"
            variant="Primary"
            label="Go back"
            onPress={() => router.back()}
          />
        </Box>
      </Box>
    );
  }

  const isDefaultStandalone = input.kind === "default";

  const showDefaultPlaceholder = isDefaultStandalone;
  const showEmptyActivitiesMessage =
    !isDefaultStandalone && activityItems.length === 0;

  const footerLabel = (() => {
    if (showDefaultPlaceholder) return DEFAULT_LABEL;
    if (showEmptyActivitiesMessage) return "No activities with a location";
    if (activityItems.length === 1) {
      const only = activityItems[0];
      if (!only) return DEFAULT_LABEL;
      return only.location_name?.trim() || only.name;
    }
    return `${activityItems.length} activities`;
  })();

  const camera = (() => {
    if (showDefaultPlaceholder) {
      return (
        <Camera
          centerCoordinate={DEFAULT_CENTER}
          zoomLevel={DEFAULT_ZOOM}
          animationMode="flyTo"
          animationDuration={600}
        />
      );
    }
    if (showEmptyActivitiesMessage || !cameraConfig) {
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
  })();

  const showActivityDetailSheet =
    showDefaultPlaceholder ||
    (!showEmptyActivitiesMessage && activityItems.length > 0);

  const handleSheetIndexChange = (index: number) => {
    if (index < 0) {
      setSelectedActivity(null);
    }
  };

  const openActivityDetail = (activity: MapViewActivityForMap) => {
    setSelectedActivity(activity);
  };

  const mapProvider = resolveProvider(
    currentUser?.apple_maps_enabled,
    currentUser?.google_maps_enabled,
  );

  const providerLabel = mapProvider === "apple" ? "Apple Maps" : "Google Maps";

  const openDirections = async (activity: MapViewActivityForMap) => {
    const lat = activity.location_lat;
    const lng = activity.location_lng;
    const label = encodeURIComponent(activity.location_name?.trim() || activity.name);

    try {
      if (mapProvider === "apple") {
        await Linking.openURL(`http://maps.apple.com/?ll=${lat},${lng}&q=${label}`);
        return;
      }

      const nativeGoogleURL = `comgooglemaps://?q=${lat},${lng}`;
      const webGoogleURL = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const canOpenNative = await Linking.canOpenURL(nativeGoogleURL);
      await Linking.openURL(canOpenNative ? nativeGoogleURL : webGoogleURL);
    } catch {
      toast.show({ message: "Couldn't open maps. Please try again." });
    }
  };

  return (
    <Screen edges={[]}>
      <Box flex={1} backgroundColor="gray50">
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            mapStyle={MAP_STYLE_URL}
            logoEnabled={false}
            attributionEnabled={true}
          >
            {camera}
            {!showDefaultPlaceholder &&
              !showEmptyActivitiesMessage &&
              activityItems.map((item, index) => (
                <PointAnnotation
                  key={activityAnnotationId(item, index)}
                  id={activityAnnotationId(item, index)}
                  coordinate={[item.location_lng, item.location_lat]}
                  onSelected={() => openActivityDetail(item)}
                >
                  <View style={styles.pin}>
                    <View style={styles.pinDot} />
                  </View>
                </PointAnnotation>
              ))}
            {showDefaultPlaceholder ? (
              <PointAnnotation
                id="map-view-default-pin"
                coordinate={DEFAULT_CENTER}
                onSelected={() => openActivityDetail(DEFAULT_PIN_DETAIL)}
              >
                <View style={styles.pin}>
                  <View style={styles.pinDot} />
                </View>
              </PointAnnotation>
            ) : null}
          </MapView>

          <View style={styles.locationLabel} pointerEvents="none">
            <Box
              backgroundColor="white"
              paddingHorizontal="sm"
              paddingVertical="xs"
              style={styles.locationLabelInner}
            >
              <Text variant="bodyXsMedium" color="gray500" numberOfLines={2}>
                {footerLabel}
              </Text>
            </Box>
          </View>
        </View>

        {showActivityDetailSheet ? (
          <BottomSheet
            ref={detailSheetRef}
            snapPoints={[...DETAIL_SHEET_SNAP_POINTS]}
            initialIndex={-1}
            onChange={handleSheetIndexChange}
          >
            {selectedActivity ? (
              <ActivityDetailSheetBody
                key={selectedActivity.id}
                activity={selectedActivity}
                providerLabel={providerLabel}
                onOpenDirections={() => openDirections(selectedActivity)}
              />
            ) : (
              <Box padding="lg" minHeight={Layout.spacing.xxl} />
            )}
          </BottomSheet>
        ) : null}
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  activityImage: {
    width: ACTIVITY_IMAGE_SIZE,
    height: ACTIVITY_IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: ColorPalette.gray100,
  },
  scheduleText: {
    flex: 1,
  },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ColorPalette.brand500,
    borderWidth: 3,
    borderColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ColorPalette.white,
  },
  locationLabel: {
    position: "absolute",
    bottom: Layout.spacing.lg,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
    alignItems: "center",
  },
  locationLabelInner: {
    borderRadius: 8,
    maxWidth: "80%",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
