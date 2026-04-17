import { useMembersList } from "@/api/memberships/custom/useMembersList";
import { useGetMembership } from "@/api/memberships/useGetMembership";
import { usePromoteToAdmin } from "@/api/memberships/usePromoteToAdmin";
import { useRemoveMember } from "@/api/memberships/useRemoveMember";
import { useUser } from "@/contexts/user";
import {
  Avatar,
  Box,
  Button,
  Divider,
  ErrorState,
  Icon,
  SkeletonCircle,
  SkeletonRect,
  Text,
  useToast,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useShareTripInvite } from "@/hooks/useShareTripInvite";
import type { ModelsMembershipAPIResponse } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Crown } from "lucide-react-native";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
} from "react-native";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function MemberRowSkeleton() {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="md"
      paddingVertical="sm"
      gap="md"
    >
      <SkeletonCircle size="lg" />
      <Box flex={1} gap="xs">
        <SkeletonRect width="half" height="xs" />
        <SkeletonRect width="quarter" height="xs" />
      </Box>
    </Box>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

type MemberRowProps = {
  member: ModelsMembershipAPIResponse;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onPromote: () => void;
  onRemove: () => void;
};

function MemberRow({
  member,
  isCurrentUser,
  isAdmin,
  onPromote,
  onRemove,
}: MemberRowProps) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="md"
      paddingVertical="xs"
      gap="sm"
    >
      <Avatar
        profilePhoto={member.profile_picture_url}
        seed={member.user_id}
        variant="lg"
      />
      <Box flex={1} gap="xxs">
        <Box flexDirection="row" alignItems="center" gap="xs" flexShrink={1}>
          <Text variant="bodySmMedium" color="gray900" numberOfLines={1}>
            {member.name ?? "Unknown"}
          </Text>
          {isCurrentUser && (
            <Text variant="bodyXsDefault" color="gray500">
              (you)
            </Text>
          )}
        </Box>

        {member.is_admin ? (
          <Box flexDirection="row" alignItems="center" gap="xxs">
            <Icon icon={Crown} size="xs" color="brand200" />
            <Text variant="bodyXsDefault" color="gray700">
              Admin
            </Text>
          </Box>
        ) : (
          <Text variant="bodyXsDefault" color="gray500">
            Member
          </Text>
        )}
      </Box>

      {isAdmin && !isCurrentUser && (
        <Box flexDirection="row" alignItems="center" gap="sm">
          {!member.is_admin && (
            <Pressable
              onPress={onPromote}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text variant="bodyXsStrong" color="statusInfo">
                Make Admin
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onRemove}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text variant="bodyXsStrong" color="statusError">
              Remove
            </Text>
          </Pressable>
        </Box>
      )}
    </Box>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MembersSettings() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useUser();
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    members = [],
    isLoading,
    isLoadingMore,
    fetchMore,
  } = useMembersList(tripID);

  const { data: myMembership } = useGetMembership(
    tripID,
    currentUser?.id ?? "",
  );

  const promoteToAdminMutation = usePromoteToAdmin({
    mutation: {
      onMutate: async ({ tripID, userID }) => {
        await queryClient.cancelQueries({ queryKey: ["members", tripID] });

        const previousMembers = queryClient.getQueryData(["members", tripID]);

        queryClient.setQueryData(["members", tripID], (oldData: any) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items?.map((item: ModelsMembershipAPIResponse) =>
                item.user_id === userID ? { ...item, is_admin: true } : item,
              ),
            })),
          };
        });

        return { previousMembers };
      },

      onError: (_err, variables, context) => {
        if (context?.previousMembers) {
          queryClient.setQueryData(
            ["members", variables.tripID],
            context.previousMembers,
          );
        }
      },

      onSettled: (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ["members", variables.tripID],
        });
      },
    },
  });

  const removeMemberMutation = useRemoveMember({
    mutation: {
      onMutate: async ({ tripID, userID }) => {
        await queryClient.cancelQueries({ queryKey: ["members", tripID] });

        const previousMembers = queryClient.getQueryData(["members", tripID]);

        queryClient.setQueryData(["members", tripID], (oldData: any) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items?.filter(
                (item: ModelsMembershipAPIResponse) => item.user_id !== userID,
              ),
            })),
          };
        });

        return { previousMembers };
      },

      onError: (_err, variables, context) => {
        if (context?.previousMembers) {
          queryClient.setQueryData(
            ["members", variables.tripID],
            context.previousMembers,
          );
        }
      },

      onSettled: (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ["members", variables.tripID],
        });
      },
    },
  });

  const { shareInvite, isPending: isInvitePending } =
    useShareTripInvite(tripID);

  const myIsAdmin = myMembership?.is_admin ?? false;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
      fetchMore();
    }
  };

  const handlePromote = (member: ModelsMembershipAPIResponse) => {
    Alert.alert(
      "Make Admin?",
      `${member.name ?? "This member"} will be able to manage the trip.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Make Admin",
          onPress: async () => {
            try {
              await promoteToAdminMutation.mutateAsync({
                tripID,
                userID: member.user_id!,
              });

              toast.show({
                message: `${member.name ?? "Member"} is now an admin.`,
              });
            } catch {
              toast.show({
                message: "Couldn't update admin. Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  const handleRemove = (member: ModelsMembershipAPIResponse) => {
    Alert.alert(
      "Remove Member?",
      `${member.name ?? "This member"} will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMemberMutation.mutateAsync({
                tripID,
                userID: member.user_id!,
              });

              toast.show({
                message: `${member.name ?? "Member"} has been removed.`,
              });
            } catch {
              toast.show({
                message: "Couldn't remove member. Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box flex={1} backgroundColor="white" padding="md">
        {[1, 2, 3].map((i) => (
          <Box key={i}>
            <MemberRowSkeleton />
            {i < 3 && <Divider />}
          </Box>
        ))}
      </Box>
    );
  }

  if (!members.length) {
    return (
      <Box flex={1} backgroundColor="white" padding="lg">
        <ErrorState title="No members found" />
      </Box>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ColorPalette.white }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      onScroll={handleScroll}
      scrollEventThrottle={200}
    >
      <Box
        backgroundColor="white"
        borderRadius="sm"
        borderWidth={1}
        borderColor="gray100"
        overflow="hidden"
      >
        {members.map((member, index) => (
          <Box key={member.user_id}>
            <MemberRow
              member={member}
              isCurrentUser={member.user_id === currentUser?.id}
              isAdmin={myIsAdmin}
              onPromote={() => handlePromote(member)}
              onRemove={() => handleRemove(member)}
            />
            {index < members.length - 1 && <Divider />}
          </Box>
        ))}

        {isLoadingMore && (
          <>
            <Divider />
            <MemberRowSkeleton />
          </>
        )}
      </Box>

      <Button
        layout="textOnly"
        label={isInvitePending ? "Generating link..." : "Add New Member"}
        variant="Secondary"
        disabled={isInvitePending}
        onPress={shareInvite}
      />
    </ScrollView>
  );
}
