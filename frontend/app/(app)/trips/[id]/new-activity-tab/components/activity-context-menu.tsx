import { Box, Text } from "@/design-system";
import GlassContainer from "@/design-system/components/glass-container";
import { ColorPalette } from "@/design-system/tokens/color";
import { BorderWidth } from "@/design-system/tokens/border";
import { Layout } from "@/design-system/tokens/layout";
import { CheckCircle, ExternalLink } from "lucide-react-native";
import { Modal, Pressable, StyleSheet } from "react-native";
import {
  CONTEXT_MENU_ICON_SIZE,
  CONTEXT_MENU_WIDTH,
  DIVIDER_COLOR,
  ROW_PRESSED_BG,
} from "../constants";
import type { ActivityContextMenuProps } from "../types";

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
              width: CONTEXT_MENU_WIDTH,
            },
          ]}
        >
          <GlassContainer>
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
                  <CheckCircle
                    size={CONTEXT_MENU_ICON_SIZE}
                    color={ColorPalette.gray900}
                  />
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
                <ExternalLink
                  size={CONTEXT_MENU_ICON_SIZE}
                  color={ColorPalette.gray900}
                />
                <Text variant="bodySmMedium" color="gray900">
                  {goToLabel}
                </Text>
              </Pressable>
            )}
          </GlassContainer>
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
