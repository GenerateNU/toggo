import { useGetTripMembers } from "@/api/memberships/useGetTripMembers";
import { Avatar, Box, Text } from "@/design-system";
import { getFirstName } from "@/utils/user-display-name";

const MAX_VISIBLE_MEMBERS = 3;
const AVATAR_OVERLAP = -6;

type TripMemberPreviewRowProps = {
  tripId: string;
  currentUserId?: string | null;
};

type MemberPreview = {
  id: string;
  username: string;
  profilePhotoUrl?: string;
};

function getSummaryText(members: MemberPreview[]) {
  if (members.length === 0) return "";
  const first = getFirstName(members[0]?.username) ?? members[0]?.username ?? "";
  const second = getFirstName(members[1]?.username) ?? members[1]?.username ?? "";
  const others = members.length - 1;

  if (others <= 0) return first;
  if (others === 1) return `${first} and ${second}`;
  return `${first} and ${others} others`;
}

export function TripMemberPreviewRow({
  tripId,
  currentUserId,
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
        username: member.username?.trim() || "Traveler",
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
  const summaryText = getSummaryText(sortedMembers);

  if (membersQuery.isError || sortedMembers.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="row" alignItems="center" gap="xxs">
      <Box flexDirection="row" alignItems="center" paddingRight="xxs">
        {visibleMembers.map((member, index) => (
          <Box
            key={member.id}
            style={{ marginLeft: index === 0 ? 0 : AVATAR_OVERLAP, zIndex: 10 - index }}
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
            style={{ marginLeft: AVATAR_OVERLAP }}
          >
            <Text variant="bodyXsMedium" color="gray500">
              +{overflowCount}
            </Text>
          </Box>
        )}
      </Box>

      <Text variant="bodySmDefault" color="gray500" numberOfLines={1}>
        {summaryText}
      </Text>
    </Box>
  );
}
