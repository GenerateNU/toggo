import { Avatar } from "@/design-system/components/avatars/avatar";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Elevation } from "@/design-system/tokens/elevation";
import React from "react";

export interface AvatarStackMember {
  userId: string;
  profilePhotoUrl?: string | null;
  username?: string | null;
}

export interface AvatarStackProps {
  members: AvatarStackMember[];
  maxVisible?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  maxVisible = 3,
}) => {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;
  const [first] = members;

  const summaryPrefix = first?.username ?? "";
  const summarySuffix =
    members.length <= 1
      ? ""
      : ` and ${members.length - 1} other${members.length - 1 === 1 ? "" : "s"}`;

  return (
    <Box flexDirection="row" alignItems="center" gap="xs">
      <Box flexDirection="row">
        {visible.map((m, i) => (
          <Box
            key={m.userId}
            borderRadius="full"
            style={{
              marginLeft: i === 0 ? 0 : -8,
              zIndex: visible.length - i,
              ...Elevation.xs,
            }}
          >
            <Avatar
              profilePhoto={m.profilePhotoUrl ?? undefined}
              seed={m.userId}
              variant="sm"
            />
          </Box>
        ))}
        {overflow > 0 && (
          <Box
            width={24}
            height={24}
            borderRadius="full"
            backgroundColor="white"
            justifyContent="center"
            alignItems="center"
            style={{ marginLeft: -8, ...Elevation.xs }}
          >
            <Text variant="bodyXxsMedium" color="gray600">
              +{overflow}
            </Text>
          </Box>
        )}
      </Box>

      {members.length > 0 && (
        <Box flexDirection="row" flexShrink={1}>
          <Text variant="bodySmDefault" color="gray600" numberOfLines={1}>
            {summaryPrefix}
          </Text>
          {summarySuffix ? (
            <Text variant="bodySmDefault" color="gray600" numberOfLines={1}>
              {summarySuffix}
            </Text>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export default AvatarStack;
