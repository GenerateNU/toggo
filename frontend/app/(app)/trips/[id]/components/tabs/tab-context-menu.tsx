import { Text } from "@/design-system/primitives/text";
import { BorderWidth } from "@/design-system/tokens/border";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import { EyeOff } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTEXT_MENU_ICON_SIZE = 18;
const CONTEXT_MENU_WIDTH = 180;

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
          <View style={styles.menu}>
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
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuAnchor: {
    position: "absolute",
  },
  menu: {
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.md,
    borderWidth: BorderWidth.hairline,
    borderColor: ColorPalette.gray100,
    overflow: "hidden",
    ...Elevation.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
  },
  rowPressed: {
    backgroundColor: ColorPalette.gray50,
  },
});