import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { CoreSize, CoreSizeKey } from "@/design-system/tokens/core-size";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import React from "react";
import { Avatar } from "./avatar";

export interface AvatarGroupMember {
  id: string;
  profilePhoto?: string;
  seed?: string;
}

interface AvatarGroupProps {
  members: AvatarGroupMember[];
  size?: CoreSizeKey;
}

interface AvatarGroupLabelProps extends AvatarGroupProps {
  primaryName: string;
}

const MAX_VISIBLE = 3;
const OVERLAP_RATIO = 0.35;

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  members,
  size = "md",
}) => {
  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - MAX_VISIBLE;

  return (
    <Box flexDirection="row" alignItems="center">
      {visible.map((member, i) => (
        <Box
          key={member.id}
          style={{
            marginLeft: i === 0 ? 0 : -avatarOverlap(size),
            zIndex: MAX_VISIBLE - i,
            ...Elevation.xs,
          }}
        >
          <Avatar
            variant={size}
            profilePhoto={member.profilePhoto}
            seed={member.seed ?? member.id}
          />
        </Box>
      ))}

      {overflow > 0 && (
        <Box
          key="overflow"
          alignItems="center"
          justifyContent="center"
          style={{
            marginLeft: -avatarOverlap(size),
            zIndex: 0,
            borderRadius: CornerRadius.full,
            width: CoreSize[size],
            height: CoreSize[size],
            ...Elevation.xs,
          }}
          backgroundColor="surfaceCard"
        >
          <Text variant="xsLabel" color="textSecondary">
            +{overflow}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export const AvatarGroupLabel: React.FC<AvatarGroupLabelProps> = ({
  members,
  size = "md",
  primaryName,
}) => {
  const overflow = members.length - 1;

  return (
    <Box flexDirection="row" alignItems="center" gap="sm">
      <AvatarGroup members={members} size={size} />
      <Box flexDirection="row" alignItems="center" gap="xs">
        <Text variant="mdLabel" color="textPrimary">
          {primaryName}
        </Text>
        {overflow > 0 && (
          <Text variant="mdParagraph" color="textSecondary">
            and {overflow} others
          </Text>
        )}
      </Box>
    </Box>
  );
};

function avatarOverlap(size: CoreSizeKey): number {
  return Math.round(CoreSize[size] * OVERLAP_RATIO);
}
