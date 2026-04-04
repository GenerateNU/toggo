import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { getTrip } from "@/api/trips/useGetTrip";
import { useUserStore } from "@/auth/store";
import { Box, Text } from "@/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const lastHandledCode = useRef<string | null>(null);

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const currentUser = useUserStore((s) => s.currentUser);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

  useEffect(() => {
    if (!code) {
      router.replace("/(app)");
      return;
    }

    if (lastHandledCode.current === code) return;
    lastHandledCode.current = code;

    const handle = async () => {
      const hasProfile = !!currentUser?.username;

      if (!isAuthenticated) {
        setPendingTripCode(code);
        router.replace("/(auth)/login");
        return;
      }

      if (!hasProfile) {
        setPendingTripCode(code);
        router.replace("/(app)");
        return;
      }

      try {
        const membership = await joinTripByInvite(code);
        let tripName = "Trip";
        if (membership?.trip_id) {
          try {
            const trip = await getTrip(membership.trip_id);
            tripName = trip?.name ?? tripName;
          } catch {
            // ignore — fallback to generic name
          }
        }
        router.replace({
          pathname: "/(app)",
          params: { joinedTripName: tripName },
        });
      } catch (err) {
        const status = (err as any)?.status;
        let joinError: string;
        if (status === 400 || status === 404) {
          joinError = "Invite code is invalid or expired";
        } else if (status === 409) {
          joinError = "You're already a member of this trip";
        } else {
          joinError = "Something went wrong, we couldn't add you";
        }
        router.replace({ pathname: "/(app)", params: { joinError } });
      }
    };

    handle();
  }, [code, currentUser, isAuthenticated, router, setPendingTripCode]);

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      backgroundColor="white"
    >
      <Text variant="bodyDefault" color="gray500">
        Joining trip…
      </Text>
    </Box>
  );
}
