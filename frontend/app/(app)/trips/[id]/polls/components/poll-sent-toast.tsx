import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Check } from "lucide-react-native";
import { StyleSheet } from "react-native";

// ─── Component ───────────────────────────────────────────────────────────────

export default function PollSentToast() {
  return (
    <Box style={styles.container}>
      <Box style={styles.iconWrapper}>
        <Check size={24} color={ColorPalette.brand500} strokeWidth={2.5} />
      </Box>

      <Box style={styles.textBlock}>
        <Text variant="headingSm" color="gray950">
          Poll Sent!
        </Text>
        <Text variant="bodySmDefault" color="gray500" numberOfLines={2}>
          Your trip will get a notification to vote.
        </Text>
      </Box>
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ICON_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderWidth: 1,
    borderColor: ColorPalette.black,
    borderRadius: CornerRadius.md,
    padding: Layout.spacing.xs,
    gap: Layout.spacing.sm,
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    borderWidth: 2,
    borderColor: ColorPalette.brand500,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: Layout.spacing.xxs,
  },
});
