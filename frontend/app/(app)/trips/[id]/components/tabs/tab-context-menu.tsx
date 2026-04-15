import GlassContainer from "@/design-system/components/glass-container";
import { Text } from "@/design-system/primitives/text";
import { BorderWidth } from "@/design-system/tokens/border";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { EyeOff } from "lucide-react-native";
import { Modal, Pressable, StyleSheet } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTEXT_MENU_ICON_SIZE = 18;
const CONTEXT_MENU_WIDTH = 180;
const DIVIDER_COLOR = "rgba(41, 54, 68, 0.2)";
const ROW_PRESSED_BG = "rgba(255, 255, 255, 0.35)";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabMenuPosition = {
  top: number;
  left: number;
};

type TabContextMenuProps = {
  visible: boolean;
  anchorPosition: TabMenuPosition | null;
  onClose: () => void;
  onHide: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TabContextMenu({
  visible,
  anchorPosition,
  onClose,
  onHide,
}: TabContextMenuProps) {
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
              left: anchorPosition.left,
              width: CONTEXT_MENU_WIDTH,
            },
          ]}
        >
          <GlassContainer>
            <Pressable
              onPress={() => {
                onClose();
                onHide();
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <EyeOff
                size={CONTEXT_MENU_ICON_SIZE}
                color={ColorPalette.gray900}
              />
              <Text variant="bodySmMedium" color="gray900">
                Hide Tab
              </Text>
            </Pressable>
          </GlassContainer>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  rowPressed: {
    backgroundColor: ROW_PRESSED_BG,
  },
  divider: {
    height: BorderWidth.thin,
    marginHorizontal: Layout.spacing.sm,
    backgroundColor: DIVIDER_COLOR,
  },
});