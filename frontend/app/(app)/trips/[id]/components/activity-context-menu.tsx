import { Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
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

const ICON_SIZE = 16;
const MENU_WIDTH = 200;
const MENU_OFFSET_Y = Layout.spacing.xxs;

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
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              position: "absolute",
              top: anchorPosition.top + MENU_OFFSET_Y,
              right: anchorPosition.right,
            },
          ]}
        >
          {onMarkRead && (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onMarkRead();
              }}
            >
              <CheckCircle size={ICON_SIZE} color={ColorPalette.gray700} />
              <Text variant="bodySmMedium" color="gray900">
                Mark as read
              </Text>
            </Pressable>
          )}
          {onGoTo && (
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onGoTo();
              }}
            >
              <ExternalLink size={ICON_SIZE} color={ColorPalette.gray700} />
              <Text variant="bodySmMedium" color="gray900">
                {goToLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    width: MENU_WIDTH,
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.md,
    paddingVertical: Layout.spacing.xxs,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: Layout.spacing.xxs },
    shadowOpacity: 0.15,
    shadowRadius: Layout.spacing.sm,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs + Layout.spacing.xxs,
  },
});
