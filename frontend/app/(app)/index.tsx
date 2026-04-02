import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { getTrip } from "@/api/trips/useGetTrip";
import CompleteProfileForm from "@/app/(auth)/components/complete-profile-form";
import { useUserStore } from "@/auth/store";
import { useUser } from "@/contexts/user";
import { BottomSheet, Box, Button, ImagePicker, Text } from "@/design-system";
import { useToast } from "@/design-system/primitives/toast-manager";
import { useCreateTrip } from "@/index";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const { currentUser } = useUser();
  const toast = useToast();
  const createTripMutation = useCreateTrip();
  const bottomSheetRef = useRef<any>(null);
  const pendingTripCode = useUserStore((s) => s.pendingTripCode);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const { joinedTripName, joinError } = useLocalSearchParams<{
    joinedTripName?: string;
    joinError?: string;
  }>();

  const needsProfile = !currentUser?.username;

  useEffect(() => {
    if (needsProfile) {
      const t = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [needsProfile]);

  useEffect(() => {
    if (joinedTripName) {
      toast.show({ message: `You've been added to ${joinedTripName}!` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedTripName]);

  useEffect(() => {
    if (joinError) {
      toast.show({ message: joinError });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinError]);

  const handleProfileCreated = async () => {
    bottomSheetRef.current?.close();

    if (pendingTripCode) {
      try {
        const membership = await joinTripByInvite(pendingTripCode);
        setPendingTripCode(null);
        let tripName = "Trip";
        if (membership?.trip_id) {
          try {
            const trip = await getTrip(membership.trip_id);
            tripName = trip?.name ?? tripName;
          } catch {
            // ignore — fallback to generic name
          }
        }
        toast.show({ message: `Profile created & added to ${tripName}!` });
      } catch {
        setPendingTripCode(null);
        toast.show({ message: "Profile created!" });
      }
    } else {
      toast.show({ message: "Profile created!" });
    }
  };

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="backgroundCard"
    >
      <Text variant="headingMd">Home</Text>
      {currentUser?.username && (
        <Text variant="bodySmDefault" color="textDefault">
          Hello @{currentUser.username}
        </Text>
      )}
      <Button
        layout="textOnly"
        label="Settings"
        variant="Primary"
        onPress={() => router.push("/settings")}
      />
      <Button
        layout="textOnly"
        label="Proof of Concept"
        variant="Primary"
        onPress={() => router.push("/testing")}
      />
      <Button
        layout="textOnly"
        label="Design System"
        variant="Primary"
        onPress={() => router.push("/ui-kit")}
      />
      <Button
        layout="textOnly"
        label={createTripMutation.isPending ? "Creating..." : "Create Trip"}
        variant="Primary"
        disabled={createTripMutation.isPending}
        onPress={async () => {
          const data = {
            name: "Spring Break",
            budget_min: 1,
            budget_max: 1000,
          };
          try {
            const result = await createTripMutation.mutateAsync({ data });
            if (result?.id) {
              router.push(`/trips/${result.id}`);
            }
          } catch (e) {
            console.log("Error creating trip", e);
          }
        }}
      />

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["80%", "95%"]}
        disableClose={needsProfile}
      >
        <Box flex={1} padding="lg" gap="lg">
          <Text variant="bodyMedium" color="textDefault">
            Create a profile
          </Text>
          <Box justifyContent="center" alignItems="center">
            <ImagePicker
              variant="circular"
              size={88}
              value={profilePhoto ?? undefined}
              onChange={(uri) => setProfilePhoto(uri)}
              placeholder="Add photo"
            />
          </Box>
          <CompleteProfileForm
            profilePhotoUri={profilePhoto}
            onSuccess={handleProfileCreated}
          />
        </Box>
      </BottomSheet>
    </Box>
  );
}
