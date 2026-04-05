import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
import { Share } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export function useShareTripInvite(tripID: string) {
  const createInviteMutation = useCreateTripInvite();

  const shareInvite = async () => {
    try {
      const invite = await createInviteMutation.mutateAsync({
        tripID,
        data: {},
      });
      const code = invite.code;
      if (!code) return;

      const inviteLink = `${API_URL}/invite/${code}`;
      await Share.share({
        message: "Join my trip on Toggo!",
        url: inviteLink,
      });
    } catch {
      // silently handled — callers can check isPending/isError if needed
    }
  };

  return { shareInvite, isPending: createInviteMutation.isPending };
}
