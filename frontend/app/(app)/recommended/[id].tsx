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
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Earth } from "lucide-react-native";
import { useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_IMAGE_HEIGHT = 220;

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

export default function RecommendedDestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const createTripMutation = useCreateTrip();
  const [isCreating, setIsCreating] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const destination = (
    RECOMMENDED_DESTINATIONS as RecommendedTripDestination[]
  ).find((d) => d.id === id);

  if (!destination) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <Text variant="bodyDefault" color="gray500">
          Destination not found.
        </Text>
      </Box>
    );
  }

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

      {/* Fixed back button */}
      <Box style={[styles.backButton, { top: insets.top + 8 }]}>
        <BackButton hasBackground />
      </Box>

      {/* Scrollable content overlapping the hero */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: HERO_IMAGE_HEIGHT - 24,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
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
        </Box>
      </Animated.ScrollView>

      {/* Fixed bottom CTA */}
      <Box style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          layout="textOnly"
          label={
            isCreating ? "Creating..." : `Plan a trip to ${destination.title}`
          }
          variant="Primary"
          onPress={handlePlanTrip}
          disabled={isCreating}
        />
      </Box>
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
  contentContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: ColorPalette.white,
  },
  activitiesContainer: {
    paddingLeft: Layout.spacing.sm,
    gap: 12,
    paddingVertical: 12,
  },
  activitiesWrapper: {
    marginHorizontal: -Layout.spacing.sm,
  },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: 16,
    backgroundColor: ColorPalette.white,
  },
});
