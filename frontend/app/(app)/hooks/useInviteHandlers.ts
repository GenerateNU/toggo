import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { getTrip } from "@/api/trips/useGetTrip";
import { useUserStore } from "@/auth/store";
import { useToast } from "@/design-system/primitives/toast-manager";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";

export function useInviteHandlers() {
  const toast = useToast();
  const pendingTripCode = useUserStore((s) => s.pendingTripCode);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

  const { joinedTripName, joinError } = useLocalSearchParams<{
    joinedTripName?: string;
    joinError?: string;
  }>();

  useEffect(() => {
    if (joinedTripName) {
      toast.show({ message: `You've been added to ${joinedTripName}!` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedTripName]);

  useEffect(() => {
    if (joinError) {
      toast.show({ message: "We couldn't join that trip. Please try again." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinError]);

  const handleProfileCreated = useCallback(async () => {
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
        toast.show({
          message: "Profile created, but we couldn't add you to the trip.",
        });
      }
    } else {
      toast.show({ message: "Profile created!" });
    }
  }, [pendingTripCode, setPendingTripCode, toast]);

  return { handleProfileCreated };
}
