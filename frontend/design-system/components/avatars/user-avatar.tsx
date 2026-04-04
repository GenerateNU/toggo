import { useGetFile } from "@/api/files/useGetFile";
import { useGetUser } from "@/api/users/useGetUser";
import { Avatar } from "./avatar";
import type { CoreSizeKey } from "@/design-system/tokens/core-size";

interface UserAvatarProps {
  userId: string;
  variant?: CoreSizeKey;
}

/**
 * Resolves a user ID → profile picture URL and renders an Avatar.
 * Falls back to the seed-based generated avatar if no photo exists.
 * Both requests are cached by React Query so repeated uses of the same
 * userId pay no extra network cost.
 */
export function UserAvatar({ userId, variant = "md" }: UserAvatarProps) {
  const { data: user } = useGetUser(userId, {
    query: { enabled: !!userId },
  });

  const { data: file } = useGetFile(user?.profile_picture ?? "", "small", {
    query: { enabled: !!user?.profile_picture },
  });

  return <Avatar variant={variant} seed={userId} profilePhoto={file?.url} />;
}
