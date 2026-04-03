import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
import { Box, Button, Icon, Screen, Text, useToast } from "@/design-system";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { Settings } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Share } from "react-native";
import CreateFAB from "./components/create-fab";
import CreatePollSheet, {
  CreatePollSheetMethods,
} from "./polls/components/create-poll-sheet";

const DUMMY_ID = "dummy-entity-001";

export default function Trip() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const createInviteMutation = useCreateTripInvite();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const createPollSheetRef = useRef<CreatePollSheetMethods>(null);
  const toast = useToast();

  const handleInvite = async () => {
    try {
      // TODO: update data field for actual flow
      const invite = await createInviteMutation.mutateAsync({
        tripID: tripID!,
        data: {},
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
      <Box flex={1} backgroundColor="gray50">
        <CreatePollSheet
          ref={createPollSheetRef}
          tripID={tripID!}
          onCreated={() =>
            toast.show({
              message: "Poll sent! Your trip members will be notified.",
            })
          }
        />
        <Box
          padding="lg"
          paddingTop="xl"
          backgroundColor="white"
          gap="xs"
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text variant="bodySmMedium" color="gray500">
              TRIP
            </Text>
            <Pressable
              onPress={() => router.push(`/trips/${tripID}/settings` as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Icon icon={Settings} size="sm" color="gray500" />
            </Pressable>
          </Box>
          <Text variant="headingMd" color="gray900">
            {tripID}
          </Text>
        </Box>

        <Box padding="lg" gap="md">
          <Text variant="bodySmMedium" color="gray500">
            VIEW
          </Text>
          <Box gap="sm">
            <Button
              layout="textOnly"
              label="Activities"
              variant="Primary"
              onPress={() =>
                router.push({ pathname: `/trips/${tripID}/activities` })
              }
            />
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

          <Text variant="bodySmMedium" color="gray500" marginTop="sm">
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
              variant="Primary"
              disabled={createInviteMutation.isPending}
              onPress={handleInvite}
            />
            {createInviteMutation.isPending && (
              <ActivityIndicator size="small" />
            )}
            {inviteLink && (
              <Box
                backgroundColor="white"
                padding="sm"
                borderRadius="sm"
              >
                <Text
                  variant="bodyXsDefault"
                  color="gray500"
                  numberOfLines={1}
                >
                  {inviteLink}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
        <CreateFAB
          tripID={tripID!}
          onCreatePoll={() => createPollSheetRef.current?.open()}
        />
      </Box>
    </Screen>
  );
}
