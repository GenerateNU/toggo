import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { getTrip } from "@/api/trips/useGetTrip";
import CompleteProfileForm from "@/app/(auth)/components/complete-profile-form";
import { useUserStore } from "@/auth/store";
import { useUser } from "@/contexts/user";
import {
  BottomSheet,
  Box,
  Button,
  Icon,
  ImagePicker,
  Text,
} from "@/design-system";
import { AnimatedBox } from "@/design-system";
import { useCreateTrip } from "@/index";
import { router, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";

export default function Home() {
  const { currentUser } = useUser();
  const createTripMutation = useCreateTrip();
  const bottomSheetRef = useRef<any>(null);
  const pendingTripCode = useUserStore((s) => s.pendingTripCode);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastPrefix, setToastPrefix] = useState("");
  const [toastBold, setToastBold] = useState<string | null>(null);
  const [toastSuffix, setToastSuffix] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "error">(
    "success",
  );
  const [toastOpacity] = useState(() => new Animated.Value(0));

  const { joinedTripName, joinError } = useLocalSearchParams<{
    joinedTripName?: string;
    joinError?: string;
  }>();

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

  // Show toast with optional bold text
  const triggerToast = (
    message: string,
    variant: "success" | "error" = "success",
    boldText?: string,
  ) => {
    if (boldText) {
      const idx = message.indexOf(boldText);
      if (idx >= 0) {
        setToastPrefix(message.slice(0, idx));
        setToastBold(boldText);
        setToastSuffix(message.slice(idx + boldText.length));
      } else {
        setToastPrefix(message);
        setToastBold(null);
        setToastSuffix("");
      }
    } else {
      setToastPrefix(message);
      setToastBold(null);
      setToastSuffix("");
    }
    setToastVariant(variant);
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
    if (joinedTripName) {
      triggerToast(
        `You've been added to ${joinedTripName}!`,
        "success",
        joinedTripName,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedTripName]);

  useEffect(() => {
    if (joinError) {
      triggerToast(joinError, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinError]);

  const handleProfileCreated = async () => {
    bottomSheetRef.current?.close();
    // Join pending trip if one was saved
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
        triggerToast(
          `Profile created & added to ${tripName}!`,
          "success",
          tripName,
        );
      } catch {
        setPendingTripCode(null);
        triggerToast("Profile created!");
      }
    } else {
      triggerToast("Profile created!");
    }
  };

  // TODO: extract toast into its own component with context after Bart's component library
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
          <Text variant="mdLabel" color="textSecondary">
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
        <AnimatedBox
          style={{ opacity: toastOpacity }}
          position="absolute"
          bottom={40}
          left={20}
          right={20}
          borderRadius="sm"
          paddingHorizontal="md"
          paddingVertical="md"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="white"
          shadowColor="black"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.1}
          shadowRadius={8}
          elevation={4}
        >
          <Box flexDirection="row" alignItems="center" gap="sm" flex={1}>
            <Icon
              icon={Check}
              size="xs"
              color={toastVariant === "error" ? "white" : "textSecondary"}
            />
            <Text
              variant="smParagraph"
              color={toastVariant === "error" ? "white" : "textSecondary"}
              style={{ flexShrink: 1 }}
            >
              {toastPrefix}
              {toastBold && (
                <Text
                  variant="smLabel"
                  color={toastVariant === "error" ? "white" : "textSecondary"}
                  style={{ fontWeight: "700" }}
                >
                  {toastBold}
                </Text>
              )}
              {toastSuffix}
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
            <Icon
              icon={X}
              size="xs"
              color={toastVariant === "error" ? "white" : "textSecondary"}
            />
          </Pressable>
        </AnimatedBox>
      )}
    </Box>
  );
}
