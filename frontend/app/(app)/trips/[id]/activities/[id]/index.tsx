import { useGetActivity } from "@/api/activities";
import {
  Box,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonRect,
  Spinner,
  Text,
} from "@/design-system";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { getActivityThumbnailUrl } from "@/utils/activity-helpers";
import { useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet } from "react-native";

export default function ActivityDetail() {
  const { id: activityID, tripID } = useLocalSearchParams<{
    id?: string;
    tripID?: string;
  }>();
  const hasRequiredParams = Boolean(tripID && activityID);

  const {
    data: activity,
    isLoading,
    isError,
    refetch,
  } = useGetActivity(tripID ?? "", activityID ?? "", {
    query: { enabled: hasRequiredParams },
  });
  const thumbnailUrl = getActivityThumbnailUrl(activity);

  if (!hasRequiredParams) {
    return (
      <Screen>
        <Box flex={1} backgroundColor="gray50" justifyContent="center">
          <ErrorState
            title="Couldn't load activity"
            description="Missing activity details. Please go back and try again."
          />
        </Box>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <Box flex={1} backgroundColor="gray50">
          <Box gap="sm" padding="sm" paddingTop="xl">
            <Box alignItems="center" paddingVertical="sm">
              <Spinner />
            </Box>
            <SkeletonRect width="full" style={{ height: HERO_IMAGE_HEIGHT }} />
            <SkeletonRect width="threeQuarter" height="md" />
            <SkeletonRect width="full" style={{ height: 140 }} />
            <SkeletonRect width="full" style={{ height: 140 }} />
          </Box>
        </Box>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <Box flex={1} backgroundColor="gray50" justifyContent="center">
          <ErrorState title="Couldn't load activity" refresh={() => refetch()} />
        </Box>
      </Screen>
    );
  }

  if (!activity) {
    return (
      <Screen>
        <Box flex={1} backgroundColor="gray50" justifyContent="center">
          <EmptyState
            title="Activity not found"
            description="This activity may have been removed or is no longer available."
          />
        </Box>
      </Screen>
    );
  }

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
