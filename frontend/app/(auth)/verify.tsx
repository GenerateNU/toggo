import { BackButton, Box, Logo, Text } from "@/design-system";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OTPVerificationForm from "./components/verify-form";

export default function VerifyPage() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Box flex={1}>
      <Image
        source={require("@/assets/images/onboarding.png")}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />

      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0.85)",
          "rgba(255,255,255,1)",
        ]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <Box
        flex={1}
        paddingHorizontal="lg"
        gap="md"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Box gap="xxs">
          <Box flexDirection="row" alignItems="center" justifyContent="center">
            <Box style={{ position: "absolute", left: 0 }}>
              <BackButton onPress={router.back} color="white" />
            </Box>
            <Logo size="xl" color="white" />
          </Box>
          <Text variant="headingMd" paddingTop="md" color="white">
            Enter Verification Code
          </Text>
          {phone && (
            <Text variant="bodySmMedium" color="white">
              We sent the code to {phone}
            </Text>
          )}
        </Box>

        <Box flex={1} justifyContent="center">
          <OTPVerificationForm />
        </Box>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
});
