import { Box, Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { Image } from "expo-image";
import { Link2 } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { getMoodBoardVariant } from "./mood-board-utils";

type MoodBoardCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress: () => void;
};

export function MoodBoardCard({ activity, onPress }: MoodBoardCardProps) {
  const variant = getMoodBoardVariant(activity);
  const title = activity.name?.trim() || "Untitled";
  const body = activity.description?.trim();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.press, { opacity: pressed ? 0.92 : 1 }]}
    >
      <Box style={styles.card} backgroundColor="white">
        {variant === "text" && (
          <Box padding="sm" gap="xs" minHeight={100}>
            {activity.proposed_by && (
              <Avatar
                variant="sm"
                seed={activity.proposed_by}
                profilePhoto={activity.proposer_picture_url ?? undefined}
              />
            )}
            <Text variant="bodyStrong" color="gray950" numberOfLines={6}>
              {body || title}
            </Text>
          </Box>
        )}

        {variant === "image" && (
          <Box>
            {activity.thumbnail_url ? (
              <Image
                source={{ uri: activity.thumbnail_url }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <Box
                height={120}
                backgroundColor="gray100"
                alignItems="center"
                justifyContent="center"
              >
                <Text variant="bodySmDefault" color="gray500">
                  Photo
                </Text>
              </Box>
            )}
            {(body || title !== "Photo") && (
              <Box padding="xs" gap="xxs">
                <Text variant="bodySmStrong" color="gray950" numberOfLines={2}>
                  {title}
                </Text>
                {body ? (
                  <Text variant="bodyXsDefault" color="gray600" numberOfLines={2}>
                    {body}
                  </Text>
                ) : null}
              </Box>
            )}
          </Box>
        )}

        {variant === "link" && (
          <Box>
            {activity.thumbnail_url ? (
              <Image
                source={{ uri: activity.thumbnail_url }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <Box
                style={styles.linkPlaceholder}
                alignItems="center"
                justifyContent="center"
              >
                <Link2 size={28} color={ColorPalette.gray400} />
              </Box>
            )}
            <Box padding="xs" gap="xxs">
              <Text variant="bodySmStrong" color="blue500" numberOfLines={2}>
                {title}
              </Text>
              {activity.media_url ? (
                <Text variant="bodyXsDefault" color="gray500" numberOfLines={1}>
                  {activity.media_url}
                </Text>
              ) : null}
            </Box>
          </Box>
        )}
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    flex: 1,
    paddingHorizontal: Layout.spacing.xxs,
    marginBottom: Layout.spacing.sm,
  },
  card: {
    borderRadius: CornerRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: ColorPalette.gray100,
  },
  linkPlaceholder: {
    width: "100%",
    aspectRatio: 1.1,
    backgroundColor: ColorPalette.gray50,
  },
});
