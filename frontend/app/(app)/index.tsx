import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import CompleteProfileForm from "@/app/(auth)/components/complete-profile-form";
import { useUserStore } from "@/auth/store";
import { useUser } from "@/contexts/user";
import { BottomSheet, Box, Button, ImagePicker, Text } from "@/design-system";
import { useCreateTrip } from "@/index";
import { router, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

export default function Home() {
  const { currentUser } = useUser();
  const createTripMutation = useCreateTrip();
  const bottomSheetRef = useRef<any>(null);
  const pendingTripCode = useUserStore((s) => s.pendingTripCode);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Profile created!");
  const [toastOpacity] = useState(() => new Animated.Value(0));

  const { joinedTrip } = useLocalSearchParams<{ joinedTrip?: string }>();

  const needsProfile = !currentUser?.username;

  // Open bottom sheet when user has no profile
  useEffect(() => {
    if (needsProfile) {
      const t = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [needsProfile]);

  // Show "Trip added!" toast from deeplink join redirect
  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  useEffect(() => {
    if (joinedTrip === "1") {
      triggerToast("Trip added!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedTrip]);

  const handleProfileCreated = async () => {
    bottomSheetRef.current?.close();
    // Join pending trip if one was saved
    if (pendingTripCode) {
      try {
        await joinTripByInvite(pendingTripCode);
        setPendingTripCode(null);
        triggerToast("Profile created & trip added!");
      } catch {
        setPendingTripCode(null);
        triggerToast("Profile created!");
      }
    } else {
      triggerToast("Profile created!");
    }
  };

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="lg"
      gap="md"
      backgroundColor="white"
    >
      <Text variant="lgHeading">Home</Text>
      {currentUser?.username && (
        <Text variant="smParagraph" color="textSecondary">
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
            name: "New Trip",
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
        snapPoints={["80%"]}
        disableClose={needsProfile}
      >
        <Box flex={1} padding="lg" gap="lg">
          <Text variant="xxlHeading" color="textSecondary">
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

      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Box flexDirection="row" alignItems="center" gap="sm" flex={1}>
            <Check size={18} color="#fff" />
            <Text variant="smParagraph" color="white">
              {toastMessage}
            </Text>
          </Box>
          <Pressable
            onPress={() => {
              Animated.timing(toastOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => setShowToast(false));
            }}
          >
            <X size={18} color="#fff" />
          </Pressable>
        </Animated.View>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
