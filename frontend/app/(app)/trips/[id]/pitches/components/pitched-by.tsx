import { Avatar, Box, Text } from "@/design-system";

interface PitchedByProps {
  userId?: string | null;
  profilePhotoUrl?: string | null;
  username?: string | null;
}

export function PitchedBy({ userId, profilePhotoUrl }: PitchedByProps) {
  const normalizedUserId = userId ?? undefined;
  const normalizedProfilePhotoUrl = profilePhotoUrl ?? undefined;

  return (
    <Box flexDirection="row" alignItems="center" gap="xs">
      <Text variant="bodyXsDefault" color="gray500">
        Pitched by
      </Text>
      <Avatar
        profilePhoto={normalizedProfilePhotoUrl}
        seed={normalizedUserId}
        variant="xs"
      />
    </Box>
  );
}
