import { Box, Text } from "@/design-system";

type HomeGreetingProps = {
  /** First name or friendly fallback (e.g. "there"). */
  greetingName: string;
};

export function HomeGreeting({ greetingName }: HomeGreetingProps) {
  return (
    <Box gap="xs">
      <Text variant="headingXl" color="gray900">
        Hi, {greetingName}
      </Text>
      <Text variant="bodySmDefault" color="gray500">
        Plan your next trip with your crew.
      </Text>
    </Box>
  );
}
