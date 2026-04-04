import { useGetImage } from "@/api/files/custom/useGetImage";
import { useUser } from "@/contexts/user";
import { getGreetingName } from "@/utils/user-display-name";

/**
 * Profile surface data for header avatar and home greeting, derived from auth user context.
 */
export function useProfileAvatar() {
  const { currentUser } = useUser();

  const { data: imageData } = useGetImage(
    [currentUser?.profile_picture],
    "small",
  );
  const profilePhotoUri = imageData[0]?.url;

  const displayName = currentUser?.name?.trim();
  const greetingName = getGreetingName(currentUser?.name);

  return {
    profilePhotoUri,
    seed: currentUser?.id ?? currentUser?.username ?? "",
    greetingName,
    accessibilityLabel: displayName
      ? `Profile, ${displayName}`
      : "Profile and settings",
  };
}
