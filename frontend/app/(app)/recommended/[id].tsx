import {
  RECOMMENDED_DESTINATIONS,
  type RecommendedTripDestination,
} from "@/app/(app)/components/home/constants";
import { RecommendedActivityCard } from "@/app/(app)/components/home/recommended-activity-card";
import { BackButton, Box, Button, Chip, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useCreateTrip } from "@/index";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import {
  computeMapCameraForActivities,
  type MapViewActivityForMap,
} from "@/utils/map-view-activities";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Earth } from "lucide-react-native";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const HERO_IMAGE_HEIGHT = 220;
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const MAP_HEIGHT = 220;
const CONTENT_CARD_TOP = HERO_IMAGE_HEIGHT - 24;
const FIXED_HEADER_HEIGHT = 48;
const HEADER_FADE_DURATION = 200;

function toActivityAPIResponse(
  activity: RecommendedTripDestination["activities"][number],
): ModelsActivityAPIResponse {
  return {
    id: activity.id,
    name: activity.name,
    thumbnail_url: activity.thumbnail_url,
    estimated_price: activity.estimated_price,
    description: activity.description,
  };
}

function toMapViewActivity(
  activity: RecommendedTripDestination["activities"][number],
): MapViewActivityForMap {
  return {
    id: activity.id,
    name: activity.name,
    location_lat: activity.location_lat,
    location_lng: activity.location_lng,
    description: activity.description,
    thumbnail_url: activity.thumbnail_url,
  };
}

export default function RecommendedDestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const createTripMutation = useCreateTrip();
  const [isCreating, setIsCreating] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerVisibleRef = useRef(false);

  const destination = (
    RECOMMENDED_DESTINATIONS as RecommendedTripDestination[]
  ).find((d) => d.id === id);

  const mapActivities = useMemo(
    () => destination?.activities.map(toMapViewActivity) ?? [],
    [destination?.activities],
  );

  const cameraConfig = useMemo(
    () => computeMapCameraForActivities(mapActivities),
    [mapActivities],
  );

  if (!destination) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <Text variant="bodyDefault" color="gray500">
          Destination not found.
        </Text>
      </Box>
    );
  }

  const titleScrollThreshold = CONTENT_CARD_TOP - insets.top;

  const headerOpacity = headerAnim;
  const backButtonOpacity = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        const shouldShow = y > titleScrollThreshold;
        if (shouldShow !== headerVisibleRef.current) {
          headerVisibleRef.current = shouldShow;
          setHeaderVisible(shouldShow);
          Animated.timing(headerAnim, {
            toValue: shouldShow ? 1 : 0,
            duration: HEADER_FADE_DURATION,
            useNativeDriver: true,
          }).start();
        }
      },
    },
  );

  const handlePlanTrip = async () => {
    setIsCreating(true);
    try {
      const result = await createTripMutation.mutateAsync({
        data: {
          name: destination.title,
          budget_min: 1,
          budget_max: 1000,
        },
      });
      if (result?.id) {
        router.replace(`/trips/${result.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenMap = () => {
    const param = encodeURIComponent(JSON.stringify(mapActivities));
    router.push({ pathname: "/map-view", params: { activities: param } });
  };

  const mapCamera = (() => {
    if (!cameraConfig) {
      return (
        <Camera
          centerCoordinate={[destination.locationLng, destination.locationLat]}
          zoomLevel={11}
        />
      );
    }
    if (cameraConfig.mode === "center") {
      return (
        <Camera
          centerCoordinate={cameraConfig.coordinate}
          zoomLevel={cameraConfig.zoomLevel}
        />
      );
    }
    return (
      <Camera
        bounds={{ ne: cameraConfig.ne, sw: cameraConfig.sw }}
        padding={{
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      />
    );
  })();

  return (
    <Box flex={1} backgroundColor="white">
      {/* Parallax hero image — grows downward from top on overscroll */}
      <Animated.View
        style={[
          styles.heroContainer,
          {
            transform: [
              {
                scale: scrollY.interpolate({
                  inputRange: [-HERO_IMAGE_HEIGHT, 0],
                  outputRange: [2, 1],
                  extrapolateRight: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: destination.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
        />
      </Animated.View>

      {/* Scrollable content overlapping the hero */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: CONTENT_CARD_TOP,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Box
          paddingHorizontal="sm"
          paddingTop="sm"
          gap="md"
          style={styles.contentContainer}
        >
          <Box gap="xs">
            <Text variant="headingXl" color="gray950">
              {destination.title}
            </Text>
            <Box flexDirection="row">
              <Chip
                label={destination.country}
                icon={Earth}
                variant="subtle"
                iconSize={14}
                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
              />
            </Box>
            <Text variant="bodyDefault" color="gray500">
              {destination.description}
            </Text>
          </Box>

          <Box>
            <Text variant="headingMd" color="gray950">
              What to do
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activitiesWrapper}
              contentContainerStyle={styles.activitiesContainer}
            >
              {destination.activities.map((activity) => (
                <Box key={activity.id} width={320}>
                  <RecommendedActivityCard
                    activity={toActivityAPIResponse(activity)}
                  />
                </Box>
              ))}
            </ScrollView>
          </Box>

          {/* Location map — tap to open full interactive map */}
          <Box gap="xs">
            <Text variant="headingMd" color="gray950">
              Location
            </Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                mapStyle={MAP_STYLE_URL}
                logoEnabled={false}
                attributionEnabled={false}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                {mapCamera}
                {mapActivities.map((activity, index) => (
                  <PointAnnotation
                    key={`pin-${activity.id}`}
                    id={`pin-${activity.id || index}`}
                    coordinate={[activity.location_lng, activity.location_lat]}
                  >
                    <View style={styles.pin}>
                      <View style={styles.pinDot} />
                    </View>
                  </PointAnnotation>
                ))}
              </MapView>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={handleOpenMap}
              />
            </View>
          </Box>
          <SafeAreaView edges={["bottom"]} />
        </Box>
      </Animated.ScrollView>

      {/* Back button over hero — fades out when fixed header appears */}
      <Animated.View
        style={[
          styles.backButton,
          { top: insets.top + 8, opacity: backButtonOpacity },
        ]}
        pointerEvents={headerVisible ? "none" : "auto"}
      >
        <BackButton hasBackground />
      </Animated.View>

      {/* Fixed header — fades in when title scrolls out of view */}
      <Animated.View
        style={[
          styles.fixedHeader,
          { paddingTop: insets.top, opacity: headerOpacity },
        ]}
        pointerEvents={headerVisible ? "auto" : "none"}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          paddingHorizontal="sm"
          height={FIXED_HEADER_HEIGHT}
        >
          <BackButton />
          <Box flex={1} alignItems="center" paddingHorizontal="xs">
            <Text variant="headingMd" color="gray950" numberOfLines={1}>
              {destination.title}
            </Text>
          </Box>
          <Box width={36} />
        </Box>
      </Animated.View>

      {/* Fixed bottom CTA with gradient fade */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.6)",
          "rgba(255,255,255,0.9)",
          "rgba(255,255,255,1)",
          "rgba(255,255,255,1)",
        ]}
        style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <Button
          layout="textOnly"
          label={
            isCreating ? "Creating..." : `Plan a trip to ${destination.title}`
          }
          variant="Primary"
          onPress={handlePlanTrip}
          disabled={isCreating}
        />
      </LinearGradient>
    </Box>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_IMAGE_HEIGHT,
    transformOrigin: "top",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: ColorPalette.white,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: ColorPalette.white,
  },
  activitiesContainer: {
    paddingHorizontal: Layout.spacing.sm,
    gap: 12,
    paddingVertical: 12,
  },
  activitiesWrapper: {
    marginHorizontal: -Layout.spacing.sm,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
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
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: 100,
  },
});
