import { Box, Text } from "@/design-system";

type HomeHeaderProps = {
  username?: string;
};

export function HomeHeader({ username }: HomeHeaderProps) {
  return (
    <Box
      backgroundColor="backgroundCard"
      padding="lg"
      paddingTop="xl"
      paddingBottom="lg"
      gap="xxs"
      borderBottomWidth={1}
      borderBottomColor="borderSubtle"
    >
      <Text variant="headingMd" color="textInverse">
        Home
      </Text>
      {username && (
        <Text variant="bodySmDefault" color="textSubtle">
          @{username}
        </Text>
      )}
    </Box>
  );
}
