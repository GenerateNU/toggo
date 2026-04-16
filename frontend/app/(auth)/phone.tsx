import { Box, Logo, Text } from "@/design-system";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PhoneNumberForm from "./components/login-form";

export default function PhonePage() {
  const insets = useSafeAreaInsets();

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
        <Box gap="xs">
          <Box alignItems="center">
            <Logo size="xl" color="white" />
          </Box>
          <Text variant="headingSm" color="white">
            Enter your phone number
          </Text>
        </Box>

        <Box flex={1}>
          <PhoneNumberForm />
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
