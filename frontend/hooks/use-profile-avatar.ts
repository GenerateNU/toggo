import { useUser } from "@/contexts/user";
import { getGreetingName } from "@/utils/user-display-name";

/**
 * Profile surface data for header avatar and home greeting, derived from auth user context.
 */
export function useProfileAvatar() {
  const { currentUser } = useUser();

  const displayName = currentUser?.name?.trim();
  const greetingName = getGreetingName(currentUser?.name);

  return {
    profilePhotoUri: currentUser?.profile_picture,
    seed: currentUser?.id ?? currentUser?.username ?? "",
    greetingName,
    accessibilityLabel: displayName
      ? `Profile, ${displayName}`
      : "Profile and settings",
  };
}
