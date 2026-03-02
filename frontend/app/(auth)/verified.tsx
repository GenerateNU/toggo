import { Box, Text } from "@/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

function VerifiedIllustration() {
  return (
    <Box alignItems="center" justifyContent="center" gap="xs">
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "#ECECEC",
          position: "absolute",
          top: -10,
          right: 10,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 48,
          borderRightWidth: 48,
          borderBottomWidth: 80,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: "#A0A0A0",
          marginTop: 30,
        }}
      />
      <View
        style={{
          width: 56,
          height: 56,
          backgroundColor: "#C0C0C0",
          transform: [{ rotate: "45deg" }],
          marginTop: -24,
          marginLeft: 80,
        }}
      />
    </Box>
  );
}

export default function VerifiedPage() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace({
        pathname: "/(auth)/complete-profile",
        params: { phone: phone ?? "" },
      });
    }, 2000);
    return () => clearTimeout(timeout);
  }, [phone, router]);

  return (
    <Box
      flex={1}
      backgroundColor="white"
      justifyContent="center"
      alignItems="center"
      padding="xl"
      gap="xl"
    >
      <Box width={180} height={160} justifyContent="center" alignItems="center">
        <VerifiedIllustration />
      </Box>

      <Box alignItems="center" gap="sm">
        <Text variant="xxlHeading" color="textSecondary" textAlign="center">
          You've been verified
        </Text>
        <Text variant="mdParagraph" color="textQuaternary" textAlign="center">
          Plan or join a trip now !
        </Text>
      </Box>
    </Box>
  );
}
