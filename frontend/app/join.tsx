import { joinTripByInvite } from "@/api/memberships/useJoinTripByInvite";
import { useUserStore } from "@/auth/store";
import { Box, Text } from "@/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Deep link handler: frontend://join?code=XXXX
 *
 * - Authenticated + has profile  → join trip immediately, go home with toast param
 * - Authenticated + no profile   → save code, go home (bottom sheet will open)
 * - Not authenticated            → save code, go to login
 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const handled = useRef(false);

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const currentUser = useUserStore((s) => s.currentUser);
  const setPendingTripCode = useUserStore((s) => s.setPendingTripCode);

  useEffect(() => {
    if (handled.current || !code) return;
    handled.current = true;

    const handle = async () => {
      const hasProfile = !!currentUser?.username;

      if (!isAuthenticated) {
        setPendingTripCode(code);
        router.replace("/(auth)/login");
        return;
      }

      if (!hasProfile) {
        // Authenticated but no profile yet — save code, go home (profile bottom sheet opens)
        setPendingTripCode(code);
        router.replace("/(app)");
        return;
      }

      // Fully authenticated — join now
      try {
        await joinTripByInvite(code);
        router.replace({ pathname: "/(app)", params: { joinedTrip: "1" } });
      } catch {
        // If already a member or code invalid, still go home
        router.replace("/(app)");
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
      <Text variant="mdParagraph" color="textQuaternary">
        Joining trip…
      </Text>
    </Box>
  );
}
