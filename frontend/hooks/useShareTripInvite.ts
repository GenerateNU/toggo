import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
import * as Linking from "expo-linking";
import { Share } from "react-native";

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

      const deepLink = Linking.createURL("join", { queryParams: { code } });
      await Share.share({
        message: "Join my trip on Toggo!",
        url: deepLink,
      });
    } catch {
      // silently handled — callers can check isPending/isError if needed
    }
  };

  return { shareInvite, isPending: createInviteMutation.isPending };
}
