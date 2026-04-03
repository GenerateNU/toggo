import { useMembersList } from "@/api/memberships/custom/useMembersList";
import { useGetMembership } from "@/api/memberships/useGetMembership";
import { usePromoteToAdmin } from "@/api/memberships/usePromoteToAdmin";
import { useCreateTripInvite } from "@/api/trips/useCreateTripInvite";
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
import type { ModelsMembershipAPIResponse } from "@/types/types.gen";
import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { Crown } from "lucide-react-native";
import { Alert, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Share } from "react-native";

function MemberRowSkeleton() {
  return (
    <Box flexDirection="row" alignItems="center" paddingHorizontal="md" paddingVertical="sm" gap="md">
      <SkeletonCircle size="md" />
      <Box flex={1} gap="xs">
        <SkeletonRect width="half" height="xs" />
        <SkeletonRect width="quarter" height="xs" />
      </Box>
    </Box>
  );
}

type MemberRowProps = {
  member: ModelsMembershipAPIResponse;
  isCurrentUser: boolean;
  canPromote: boolean;
  onPromote: () => void;
};

function MemberRow({ member, isCurrentUser, canPromote, onPromote }: MemberRowProps) {
  return (
    <Box flexDirection="row" alignItems="flex-start" paddingHorizontal="md" paddingVertical="sm" gap="md">
      <Avatar profilePhoto={member.profile_picture_url} seed={member.user_id} variant="md" />
      <Box flex={1} gap="xxs">
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Text variant="bodySmMedium" color="gray900">
            {member.username ?? "Unknown"}
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
      {canPromote && !member.is_admin && (
        <Pressable onPress={onPromote} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Text variant="bodyXsMedium" color="statusInfo">
            Make Admin
          </Text>
        </Pressable>
      )}
    </Box>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MembersSettings() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useUser();
  const toast = useToast();

  const { members, isLoading, isLoadingMore, fetchMore } = useMembersList(tripID);
  const { data: myMembership } = useGetMembership(tripID!, currentUser?.id ?? "");
  const promoteToAdminMutation = usePromoteToAdmin();
  const createInviteMutation = useCreateTripInvite();

  const isAdmin = myMembership?.is_admin ?? false;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
      fetchMore();
    }
  };

  const handleInvite = async () => {
    try {
      const invite = await createInviteMutation.mutateAsync({ tripID: tripID!, data: {} });
      const code = invite.code;
      if (!code) return;
      const deepLink = Linking.createURL("join", { queryParams: { code } });
      await Share.share({ message: `Join my trip on Toggo! ${deepLink}`, url: deepLink });
    } catch {
      toast.show({ message: "Couldn't generate invite link. Please try again." });
    }
  };

  const handlePromote = (member: ModelsMembershipAPIResponse) => {
    Alert.alert(
      "Make Admin?",
      `${member.username ?? "This member"} will be able to manage the trip and its members.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Make Admin",
          onPress: async () => {
            try {
              await promoteToAdminMutation.mutateAsync({ tripID: tripID!, userID: member.user_id! });
              toast.show({ message: `${member.username ?? "Member"} is now an admin.` });
            } catch {
              toast.show({ message: "Couldn't update admin. Please try again." });
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <Box flex={1} backgroundColor="white" paddingTop="md" paddingHorizontal="md">
        <Box backgroundColor="white" borderRadius="sm" borderWidth={1} borderColor="gray100" overflow="hidden">
          {[1, 2, 3].map((i) => (
            <Box key={i}>
              <MemberRowSkeleton />
              {i < 3 && <Divider />}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (members.length === 0) {
    return (
      <Box flex={1} backgroundColor="white" padding="lg">
        <ErrorState title="No members found" />
      </Box>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ColorPalette.white }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      onScroll={handleScroll}
      scrollEventThrottle={200}
    >
      <Box backgroundColor="white" borderRadius="sm" borderWidth={1} borderColor="gray100" overflow="hidden">
        {members.map((member, index) => (
          <Box key={member.user_id}>
            <MemberRow
              member={member}
              isCurrentUser={member.user_id === currentUser?.id}
              canPromote={isAdmin}
              onPromote={() => handlePromote(member)}
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
        label={createInviteMutation.isPending ? "Generating link..." : "Add New Member"}
        variant="Secondary"
        disabled={createInviteMutation.isPending}
        onPress={handleInvite}
      />
    </ScrollView>
  );
}
