import { useGetFile } from "@/api/files/useGetFile";
import { useUser } from "@/contexts/user";
import { Avatar, Box, Text } from "@/design-system";

export default function Accounts() {
  const { currentUser } = useUser();

  const { data: profilePhotoData } = useGetFile(
    currentUser?.profile_picture ?? "",
    "small",
    { query: { enabled: !!currentUser?.profile_picture } },
  );

  return (
    <Box flex={1} backgroundColor="surfaceBackground">
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
          <Text variant="xxlHeading" color="textSecondary">
            {currentUser?.name ?? "—"}
          </Text>
          <Text variant="mdParagraph" color="textQuaternary">
            @{currentUser?.username ?? "—"}
          </Text>
        </Box>
      </Box>

      {/* Info rows */}
      <Box backgroundColor="white">
        <InfoRow label="Name" value={currentUser?.name} />
        <Box height={1} backgroundColor="borderPrimary" marginLeft="md" />
        <InfoRow
          label="Username"
          value={currentUser?.username ? `@${currentUser.username}` : undefined}
        />
        <Box height={1} backgroundColor="borderPrimary" marginLeft="md" />
        <InfoRow label="Phone" value={currentUser?.phone_number} />
        <Box height={1} backgroundColor="borderPrimary" marginLeft="md" />
        <InfoRow label="Timezone" value={currentUser?.timezone} />
      </Box>
    </Box>
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
      <Text variant="mdParagraph" color="textQuaternary">
        {label}
      </Text>
      <Text variant="mdParagraph" color="textSecondary">
        {value ?? "—"}
      </Text>
    </Box>
  );
}
