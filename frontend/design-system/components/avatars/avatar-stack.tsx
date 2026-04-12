import { Avatar } from "@/design-system/components/avatars/avatar";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import React from "react";

const AVATAR_OVERLAP = -Layout.spacing.xs;
const OVERFLOW_BADGE_SIZE = CoreSize.sm;

export interface AvatarStackMember {
  userId: string;
  profilePhotoUrl?: string | null;
  name?: string | null;
}

export interface AvatarStackProps {
  members: AvatarStackMember[];
  maxVisible?: number;
  showName?: boolean;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  maxVisible = 3,
  showName = true,
}) => {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;
  const [first] = members;

  const summaryPrefix = first?.name ?? "";
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
              marginLeft: i === 0 ? 0 : AVATAR_OVERLAP,
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
            width={OVERFLOW_BADGE_SIZE}
            height={OVERFLOW_BADGE_SIZE}
            borderRadius="full"
            backgroundColor="white"
            justifyContent="center"
            alignItems="center"
            style={{ marginLeft: AVATAR_OVERLAP, ...Elevation.xs }}
          >
            <Text variant="bodyXxsMedium" color="gray600">
              +{overflow}
            </Text>
          </Box>
        )}
      </Box>

      {showName && members.length > 0 && (
        <Box flexDirection="row" flexShrink={1}>
          <Text variant="bodyMedium" color="gray600" numberOfLines={1}>
            {summaryPrefix}
          </Text>
          {summarySuffix ? (
            <Text variant="bodyMedium" color="gray600" numberOfLines={1}>
              {summarySuffix}
            </Text>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export default AvatarStack;
