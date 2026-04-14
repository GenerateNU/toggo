import { useGetTripMembers } from "@/api/memberships/useGetTripMembers";
import { Avatar, Box, Text } from "@/design-system";
import { Shadow } from "@/design-system/tokens/elevation";
import { getFirstName } from "@/utils/user-display-name";
import { MAX_VISIBLE_MEMBERS } from "./constants";
import type { MemberPreview, TripMemberPreviewRowProps } from "./types";

const AVATAR_OVERLAP = -6;

type MemberSummaryTextProps = {
  members: MemberPreview[];
  textSize: "default" | "small";
};

function MemberSummaryText({ members, textSize }: MemberSummaryTextProps) {
  if (members.length === 0) return null;

  const strongVariant =
    textSize === "small" ? "bodySmStrong" : "bodyStrong";
  const defaultVariant =
    textSize === "small" ? "bodySmDefault" : "bodyDefault";

  const firstName =
    getFirstName(members[0]?.name) ?? members[0]?.name ?? "";

  if (members.length === 1) {
    return (
      <Text variant={strongVariant} color="gray950" numberOfLines={1}>
        {firstName}
      </Text>
    );
  }

  if (members.length === 2) {
    const secondName =
      getFirstName(members[1]?.name) ?? members[1]?.name ?? "";
    return (
      <Text variant={defaultVariant} color="gray400" numberOfLines={1}>
        <Text variant={strongVariant} color="gray950">
          {firstName}
        </Text>
        {" and "}
        <Text variant={strongVariant} color="gray950">
          {secondName}
        </Text>
      </Text>
    );
  }

  const othersCount = members.length - 1;
  return (
    <Text variant={defaultVariant} color="gray400" numberOfLines={1}>
      <Text variant={strongVariant} color="gray950">
        {firstName}
      </Text>
      {` and ${othersCount} others`}
    </Text>
  );
}

export function TripMemberPreviewRow({
  tripId,
  currentUserId,
  textSize = "default",
}: TripMemberPreviewRowProps) {
  const membersQuery = useGetTripMembers(
    tripId,
    { limit: 12 },
    {
      query: {
        staleTime: 30_000,
      },
    },
  );

  const allMembers =
    membersQuery.data?.items
      ?.filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((member) => ({
        id: member.user_id ?? "",
        name: member.name?.trim() || "Traveler",
        profilePhotoUrl: member.profile_picture_url ?? undefined,
      }))
      .filter((member) => member.id) ?? [];

  const sortedMembers = currentUserId
    ? [...allMembers].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      })
    : allMembers;

  const visibleMembers = sortedMembers.slice(0, MAX_VISIBLE_MEMBERS);
  const overflowCount = Math.max(sortedMembers.length - MAX_VISIBLE_MEMBERS, 0);

  if (membersQuery.isError || sortedMembers.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="row" alignItems="center" gap="xxs">
      <Box flexDirection="row" alignItems="center" paddingRight="xxs">
        {visibleMembers.map((member, index) => (
          <Box
            key={member.id}
            style={{
              marginLeft: index === 0 ? 0 : AVATAR_OVERLAP,
              zIndex: 10 - index,
            }}
          >
            <Avatar
              profilePhoto={member.profilePhotoUrl}
              seed={member.id}
              variant="sm"
            />
          </Box>
        ))}
        {overflowCount > 0 && (
          <Box
            width={24}
            height={24}
            borderRadius="full"
            backgroundColor="white"
            borderWidth="hairline"
            borderColor="gray300"
            alignItems="center"
            justifyContent="center"
            style={[{ marginLeft: AVATAR_OVERLAP }, Shadow.md]}
          >
            <Text variant="bodyXsMedium" color="gray500">
              +{overflowCount}
            </Text>
          </Box>
        )}
      </Box>

      <MemberSummaryText members={sortedMembers} textSize={textSize} />
    </Box>
  );
}

export default TripMemberPreviewRow;
