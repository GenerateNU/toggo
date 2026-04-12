import { useGetActivity } from "@/api/activities";
import { Box, Screen, Text } from "@/design-system";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet } from "react-native";

const DUMMY_ID = "dummy-entity-001";

const DUMMY_ACTIVITY: ModelsActivityAPIResponse = {
  id: DUMMY_ID,
  name: "Visit the Eiffel Tower",
  description:
    "Take a guided tour of the Eiffel Tower and enjoy panoramic views of Paris from the top.",
  proposed_by: "demo-user",
  proposer_username: "Demo User",
  category_names: ["Sightseeing", "Landmarks"],
  location_name: "Champ de Mars, Paris, France",
  location_lat: 48.8584,
  location_lng: 2.2945,
  estimated_price: 25,
};

export default function ActivityDetail() {
  const { id: activityID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  const isDummy = activityID === DUMMY_ID;

  const {
    data: fetchedActivity,
    isLoading,
    isError,
  } = useGetActivity(tripID ?? "", activityID, {
    query: { enabled: !isDummy && !!(tripID && activityID) },
  });

  const activity = isDummy ? DUMMY_ACTIVITY : fetchedActivity;
  const thumbnailUrl = activity?.thumbnail_url ?? activity?.media_url;

  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        {thumbnailUrl ? (
          <Box backgroundColor="gray100">
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Box>
        ) : null}

        <Box padding="lg" paddingTop="xl" backgroundColor="white" gap="xs">
          <Text variant="bodySmMedium" color="gray500">
            ACTIVITY
          </Text>
          <Text variant="headingMd" color="gray900">
            {activity?.name ?? "Activity Detail"}
          </Text>
        </Box>

        {isLoading && (
          <Box padding="lg">
            <Text variant="bodyDefault" color="gray500">
              Loading...
            </Text>
          </Box>
        )}

        {isError && (
          <Box padding="lg">
            <Text variant="bodyDefault" color="gray500">
              Failed to load activity.
            </Text>
          </Box>
        )}

        {activity && (
          <ScrollView>
            <Box padding="sm" gap="xs">
              {activity.description && (
                <Box
                  backgroundColor="white"
                  borderRadius="md"
                  padding="md"
                  gap="xs"
                >
                  <Text variant="bodySmMedium" color="gray500">
                    DESCRIPTION
                  </Text>
                  <Text variant="bodyDefault" color="gray900">
                    {activity.description}
                  </Text>
                </Box>
              )}

              {activity.image_ids && activity.image_ids.length > 0 && (
                <Box
                  backgroundColor="white"
                  borderRadius="md"
                  padding="md"
                  gap="sm"
                >
                  <Text variant="bodySmMedium" color="gray500">
                    IMAGES ({activity.image_ids.length})
                  </Text>
                  <Box flexDirection="row" flexWrap="wrap" gap="xs">
                    {activity.image_ids.map((img, i) =>
                      img.image_url ? (
                        <Image
                          key={img.image_id ?? i}
                          source={{ uri: img.image_url }}
                          style={{
                            width: 120,
                            height: 120,
                            borderRadius: CornerRadius.sm,
                          }}
                          resizeMode="cover"
                        />
                      ) : null,
                    )}
                  </Box>
                </Box>
              )}

              <Box
                backgroundColor="white"
                borderRadius="md"
                padding="md"
                gap="sm"
              >
                <Box gap="xs">
                  <Text variant="bodySmMedium" color="gray500">
                    PROPOSED BY
                  </Text>
                  <Text variant="bodyDefault" color="gray900">
                    {activity.proposer_username ?? activity.proposed_by ?? "—"}
                  </Text>
                </Box>

                {activity.category_names &&
                  activity.category_names.length > 0 && (
                    <>
                      <Box height={1} backgroundColor="gray300" />
                      <Box gap="xs">
                        <Text variant="bodySmMedium" color="gray500">
                          CATEGORIES
                        </Text>
                        <Text variant="bodyDefault" color="gray900">
                          {activity.category_names.join(", ")}
                        </Text>
                      </Box>
                    </>
                  )}

                {activity.location_name && (
                  <>
                    <Box height={1} backgroundColor="gray300" />
                    <Box gap="xs">
                      <Text variant="bodySmMedium" color="gray500">
                        LOCATION
                      </Text>
                      <Text variant="bodyDefault" color="gray900">
                        {activity.location_name}
                      </Text>
                    </Box>
                  </>
                )}

                {activity.estimated_price != null && (
                  <>
                    <Box height={1} backgroundColor="gray300" />
                    <Box gap="xs">
                      <Text variant="bodySmMedium" color="gray500">
                        ESTIMATED PRICE
                      </Text>
                      <Text variant="bodyDefault" color="gray900">
                        {activity.estimated_price}
                      </Text>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </ScrollView>
        )}
      </Box>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const HERO_IMAGE_HEIGHT = 220;

const styles = StyleSheet.create({
  heroImage: {
    width: "100%",
    height: HERO_IMAGE_HEIGHT,
  },
});
