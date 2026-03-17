import { useGetActivity } from "@/api/activities";
import { Box, Screen, Text } from "@/design-system";
import { useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";

export default function ActivityDetail() {
  const { id: activityID, tripID } = useLocalSearchParams<{
    id: string;
    tripID: string;
  }>();

  const {
    data: activity,
    isLoading,
    isError,
  } = useGetActivity(tripID, activityID);

  return (
    <Screen>
      <Box flex={1} backgroundColor="surfaceBackground">
        <Box
          padding="lg"
          paddingTop="xl"
          backgroundColor="surfaceCard"
          gap="xs"
        >
          <Text variant="smLabel" color="textQuaternary">
            ACTIVITY
          </Text>
          <Text variant="lgHeading" color="textSecondary">
            {activity?.name ?? "Activity Detail"}
          </Text>
        </Box>

        {isLoading && (
          <Box padding="lg">
            <Text variant="mdParagraph" color="textQuaternary">
              Loading...
            </Text>
          </Box>
        )}

        {isError && (
          <Box padding="lg">
            <Text variant="mdParagraph" color="textQuaternary">
              Failed to load activity.
            </Text>
          </Box>
        )}

        {activity && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {activity.description && (
              <Box
                backgroundColor="surfaceCard"
                borderRadius="md"
                padding="md"
                gap="xs"
              >
                <Text variant="smLabel" color="textQuaternary">
                  DESCRIPTION
                </Text>
                <Text variant="mdParagraph" color="textSecondary">
                  {activity.description}
                </Text>
              </Box>
            )}

            {activity.image_ids && activity.image_ids.length > 0 && (
              <Box
                backgroundColor="surfaceCard"
                borderRadius="md"
                padding="md"
                gap="sm"
              >
                <Text variant="smLabel" color="textQuaternary">
                  IMAGES ({activity.image_ids.length})
                </Text>
                <View style={styles.imageGrid}>
                  {activity.image_ids.map((img, i) =>
                    img.image_url ? (
                      <Image
                        key={img.image_id ?? i}
                        source={{ uri: img.image_url }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    ) : null,
                  )}
                </View>
              </Box>
            )}

            <Box
              backgroundColor="surfaceCard"
              borderRadius="md"
              padding="md"
              gap="sm"
            >
              <Box gap="xs">
                <Text variant="smLabel" color="textQuaternary">
                  PROPOSED BY
                </Text>
                <Text variant="mdParagraph" color="textSecondary">
                  {activity.proposer_username ?? activity.proposed_by ?? "—"}
                </Text>
              </Box>

              {activity.category_names &&
                activity.category_names.length > 0 && (
                  <>
                    <Box height={1} backgroundColor="borderPrimary" />
                    <Box gap="xs">
                      <Text variant="smLabel" color="textQuaternary">
                        CATEGORIES
                      </Text>
                      <Text variant="mdParagraph" color="textSecondary">
                        {activity.category_names.join(", ")}
                      </Text>
                    </Box>
                  </>
                )}

              {activity.location_name && (
                <>
                  <Box height={1} backgroundColor="borderPrimary" />
                  <Box gap="xs">
                    <Text variant="smLabel" color="textQuaternary">
                      LOCATION
                    </Text>
                    <Text variant="mdParagraph" color="textSecondary">
                      {activity.location_name}
                    </Text>
                  </Box>
                </>
              )}

              {activity.estimated_price != null && (
                <>
                  <Box height={1} backgroundColor="borderPrimary" />
                  <Box gap="xs">
                    <Text variant="smLabel" color="textQuaternary">
                      ESTIMATED PRICE
                    </Text>
                    <Text variant="mdParagraph" color="textSecondary">
                      {activity.estimated_price}
                    </Text>
                  </Box>
                </>
              )}
            </Box>
          </ScrollView>
        )}
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
});
