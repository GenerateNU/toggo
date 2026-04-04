import { Box, Text } from "@/design-system";

type HomeHeaderProps = {
  username?: string;
};

export function HomeHeader({ username }: HomeHeaderProps) {
  return (
    <Box
      backgroundColor="white"
      padding="lg"
      paddingTop="xl"
      paddingBottom="lg"
      gap="xxs"
      borderBottomWidth={1}
      borderBottomColor="gray100"
    >
      <Text variant="headingMd" color="gray900">
        Home
      </Text>
      {username && (
        <Text variant="bodySmDefault" color="gray500">
          @{username}
        </Text>
      )}
    </Box>
  );
}

export default HomeHeader;
