import { Box, Button, Text } from "@/design-system";
import { useRouter } from "expo-router";

export default function LoginPage() {
  const router = useRouter();

  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="space-between"
      padding="lg"
      paddingBottom="xl"
    >
      <Box alignItems="center" paddingTop="xl">
        <Text variant="logoXxl" color="textSecondary">
          TOGGO
        </Text>
      </Box>

      <Box flex={1} justifyContent="center" alignItems="center">
        <Box
          width={140}
          height={140}
          justifyContent="center"
          alignItems="center"
          gap="xs"
        >
          <Box flexDirection="row" gap="xs" alignItems="flex-end">
            <Box
              width={0}
              height={0}
              style={{
                borderLeftWidth: 26,
                borderRightWidth: 26,
                borderBottomWidth: 44,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderBottomColor: "#000",
              }}
            />
            <Box
              width={44}
              height={44}
              borderRadius="full"
              backgroundColor="secondaryBackground"
            />
          </Box>
          <Box
            width={44}
            height={44}
            style={{ transform: [{ rotate: "45deg" }] }}
            backgroundColor="black"
          />
        </Box>
      </Box>

      <Button
        layout="textOnly"
        label="Log in or create an account"
        variant="Primary"
        onPress={() => router.push("/(auth)/phone")}
      />
    </Box>
  );
}
