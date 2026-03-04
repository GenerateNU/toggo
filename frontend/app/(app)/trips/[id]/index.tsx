import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
import { Box, Button, Screen, Text } from "@/design-system";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Share } from "react-native";

const DUMMY_ID = "dummy-entity-001";

export default function Trip() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const createInviteMutation = useCreateTripInvite();
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleInvite = async () => {
    try {
      const invite = await createInviteMutation.mutateAsync({
        tripID: tripID!,
      });
      const code = invite.code;
      if (!code) return;

      const deepLink = Linking.createURL("join", {
        queryParams: { code },
      });
      setInviteLink(deepLink);

      await Share.share({
        message: `Join my trip on Toggo! ${deepLink}`,
        url: deepLink,
      });
    } catch (e) {
      console.error("Failed to create invite:", e);
    }
  };

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
            TRIP
          </Text>
          <Text variant="lgHeading" color="textSecondary">
            {tripID}
          </Text>
        </Box>

        <Box padding="lg" gap="md">
          <Text variant="smLabel" color="textQuaternary">
            VIEW
          </Text>
          <Box gap="sm">
            <Button
              layout="textOnly"
              label="See Dummy Activity"
              variant="Primary"
              onPress={() =>
                router.push({
                  pathname: `/trips/${tripID}/activities/${DUMMY_ID}`,
                  params: { tripID },
                })
              }
            />
            <Button
              layout="textOnly"
              label="See Dummy Pitch"
              variant="Primary"
              onPress={() =>
                router.push({
                  pathname: `/trips/${tripID}/pitches/${DUMMY_ID}`,
                  params: { tripID },
                })
              }
            />
            <Button
              layout="textOnly"
              label="See Dummy Poll"
              variant="Primary"
              onPress={() =>
                router.push({
                  pathname: `/trips/${tripID}/polls/${DUMMY_ID}`,
                  params: { tripID },
                })
              }
            />
          </Box>

          <Text variant="smLabel" color="textQuaternary" marginTop="sm">
            CREATE
          </Text>
          <Box gap="sm">
            <Button
              layout="textOnly"
              label="New Activity"
              variant="Secondary"
              onPress={() =>
                router.push(`/trips/${tripID}/activities/creation`)
              }
            />
            <Button
              layout="textOnly"
              label="New Pitch"
              variant="Secondary"
              onPress={() => router.push(`/trips/${tripID}/pitches/creation`)}
            />
            <Button
              layout="textOnly"
              label="New Poll"
              variant="Secondary"
              onPress={() => router.push(`/trips/${tripID}/polls/creation`)}
            />
          </Box>

          <Text variant="smLabel" color="textQuaternary" marginTop="sm">
            INVITE
          </Text>
          <Box gap="sm">
            <Button
              layout="textOnly"
              label={
                createInviteMutation.isPending
                  ? "Generating..."
                  : "Invite via Link"
              }
              variant="Secondary"
              disabled={createInviteMutation.isPending}
              onPress={handleInvite}
            />
            {createInviteMutation.isPending && (
              <ActivityIndicator size="small" />
            )}
            {inviteLink && (
              <Box
                backgroundColor="surfaceCard"
                padding="sm"
                borderRadius="sm"
              >
                <Text
                  variant="xsParagraph"
                  color="textQuaternary"
                  numberOfLines={1}
                >
                  {inviteLink}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
