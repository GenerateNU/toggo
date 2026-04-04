import { useGetFile } from "@/api/files/useGetFile";
import { useUser } from "@/contexts/user";
import { Avatar, Box, Icon, Screen, Text } from "@/design-system";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable } from "react-native";

export default function Accounts() {
  const { currentUser } = useUser();

  const { data: profilePhotoData } = useGetFile(
    currentUser?.profile_picture ?? "",
    "small",
    { query: { enabled: !!currentUser?.profile_picture } },
  );

  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        <Box
          backgroundColor="white"
          padding="lg"
          alignItems="center"
          gap="md"
          marginBottom="sm"
        >
          <Avatar
            profilePhoto={profilePhotoData?.url}
            seed={currentUser?.id}
            variant="xxxl"
          />
          <Box alignItems="center" gap="xs">
            <Text variant="headingXl" color="gray900">
              {currentUser?.name ?? "—"}
            </Text>
            <Text variant="bodyDefault" color="gray500">
              @{currentUser?.username ?? "—"}
            </Text>
          </Box>
        </Box>

        <Box backgroundColor="white">
          <InfoRow label="Name" value={currentUser?.name} />
          <Box height={1} backgroundColor="gray300" marginLeft="md" />
          <InfoRow
            label="Username"
            value={
              currentUser?.username ? `@${currentUser.username}` : undefined
            }
          />
          <Box height={1} backgroundColor="gray300" marginLeft="md" />
          <InfoRow label="Phone" value={currentUser?.phone_number} />
          <Box height={1} backgroundColor="gray300" marginLeft="md" />
          <InfoRow label="Timezone" value={currentUser?.timezone} />
          <Box height={1} backgroundColor="gray300" marginLeft="md" />
          <Pressable
            onPress={() => router.push("/testing")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              paddingHorizontal="md"
              paddingVertical="sm"
            >
              <Text variant="bodyDefault" color="gray500">
                Developer Window
              </Text>
              <Icon icon={ChevronRight} size="xs" color="gray500" />
            </Box>
          </Pressable>
        </Box>
      </Box>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="md"
      paddingVertical="sm"
    >
      <Text variant="bodyDefault" color="gray500">
        {label}
      </Text>
      <Text variant="bodyDefault" color="gray900">
        {value ?? "—"}
      </Text>
    </Box>
  );
}
