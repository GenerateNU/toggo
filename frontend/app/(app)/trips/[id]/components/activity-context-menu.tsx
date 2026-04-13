import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import { BorderWidth } from "@/design-system/tokens/border";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle, ExternalLink } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type MenuPosition = { top: number; right: number };

type ActivityContextMenuProps = {
  visible: boolean;
  goToLabel: string;
  anchorPosition: MenuPosition | null;
  onClose: () => void;
  onMarkRead?: () => void;
  onGoTo?: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ICON_SIZE = 18;
const MENU_WIDTH = 214;

// Glass effect colors
const GLASS_BG = "rgba(206, 224, 238, 0.42)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.9)";
const GLASS_GRADIENT = [
  "rgba(246, 249, 252, 0.92)",
  "rgba(194, 220, 238, 0.62)",
  "rgba(186, 212, 230, 0.5)",
  "rgba(238, 236, 213, 0.3)",
  "rgba(170, 194, 214, 0.48)",
] as const;
const GLASS_GRADIENT_STOPS = [0, 0.28, 0.62, 0.76, 1] as const;
const SHINE_GRADIENT = [
  "rgba(255, 255, 255, 0.86)",
  "rgba(255, 255, 255, 0.04)",
] as const;
const DIVIDER_COLOR = "rgba(41, 54, 68, 0.2)";
const ROW_PRESSED_BG = "rgba(255, 255, 255, 0.35)";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityContextMenu({
  visible,
  goToLabel,
  anchorPosition,
  onClose,
  onMarkRead,
  onGoTo,
}: ActivityContextMenuProps) {
  if (!visible || !anchorPosition) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.menuAnchor,
            {
              top: anchorPosition.top + Layout.spacing.xxs,
              right: anchorPosition.right,
              width: MENU_WIDTH,
            },
          ]}
        >
          <View style={styles.menuContainer}>
            <LinearGradient
              colors={[...GLASS_GRADIENT]}
              locations={[...GLASS_GRADIENT_STOPS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={[...SHINE_GRADIENT]}
              locations={[0, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.topShine}
            />
            <View style={styles.glossLayer} />

            {onMarkRead && (
              <>
                <Pressable
                  onPress={() => {
                    onClose();
                    onMarkRead();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <CheckCircle size={ICON_SIZE} color={ColorPalette.gray900} />
                  <Text variant="bodySmMedium" color="gray900">
                    Mark as read
                  </Text>
                </Pressable>
                {onGoTo && <Box style={styles.divider} />}
              </>
            )}

            {onGoTo && (
              <Pressable
                onPress={() => {
                  onClose();
                  onGoTo();
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <ExternalLink size={ICON_SIZE} color={ColorPalette.gray900} />
                <Text variant="bodySmMedium" color="gray900">
                  {goToLabel}
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: ColorPalette.backgroundOverlay,
  },
  menuAnchor: {
    position: "absolute",
  },
  menuContainer: {
    overflow: "hidden",
    borderRadius: CornerRadius.xxl,
    borderWidth: BorderWidth.thin,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS_BG,
    ...Elevation.xl,
  },
  topShine: {
    ...StyleSheet.absoluteFillObject,
    height: "42%",
  },
  glossLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm - Layout.spacing.xxs,
    paddingVertical: Layout.spacing.xs,
  },
  rowPressed: {
    backgroundColor: ROW_PRESSED_BG,
  },
  divider: {
    height: BorderWidth.thin,
    marginLeft: Layout.spacing.md + 2,
    marginRight: Layout.spacing.sm - Layout.spacing.xxs,
    backgroundColor: DIVIDER_COLOR,
  },
});
