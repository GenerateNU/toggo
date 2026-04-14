import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { LinearGradient } from "expo-linear-gradient";
import { PencilLine, Trash2 } from "lucide-react-native";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

interface PitchOwnerMenuProps {
  visible: boolean;
  topInset: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MENU_HORIZONTAL_MARGIN = 84;
const MENU_RIGHT = 12;
const MENU_TOP_OFFSET = 40;

export function PitchOwnerMenu({
  visible,
  topInset,
  onClose,
  onEdit,
  onDelete,
}: PitchOwnerMenuProps) {
  const { width } = useWindowDimensions();
  const menuWidth = Math.min(width - MENU_HORIZONTAL_MARGIN * 2, 214);

  if (!visible) {
    return null;
  }

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
              top: topInset + MENU_TOP_OFFSET,
              right: MENU_RIGHT,
              width: menuWidth,
            },
          ]}
        >
          <View style={styles.menuContainer}>
            <LinearGradient
              colors={[
                "rgba(246, 249, 252, 0.92)",
                "rgba(194, 220, 238, 0.62)",
                "rgba(186, 212, 230, 0.5)",
                "rgba(238, 236, 213, 0.3)",
                "rgba(170, 194, 214, 0.48)",
              ]}
              locations={[0, 0.28, 0.62, 0.76, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.86)",
                "rgba(255, 255, 255, 0.04)",
              ]}
              locations={[0, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.topShine}
            />

            <LinearGradient
              colors={["rgba(255,255,255,0.34)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.diagonalGlow}
            />

            <LinearGradient
              colors={[
                "rgba(255,255,255,0.2)",
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.12)",
              ]}
              locations={[0, 0.55, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.refractionLayer}
            />

            <View style={styles.glossLayer} />

            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <PencilLine size={18} color={ColorPalette.gray900} />
              <Text variant="bodySmMedium" color="gray900">
                Edit pitch
              </Text>
            </Pressable>

            <Box style={styles.divider} />

            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <Trash2 size={18} color={ColorPalette.statusError} />
              <Text variant="bodySmMedium" color="statusError">
                Delete pitch
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
  },
  menuAnchor: {
    position: "absolute",
  },
  menuContainer: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    backgroundColor: "rgba(206, 224, 238, 0.42)",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 16,
  },
  topShine: {
    ...StyleSheet.absoluteFillObject,
    height: "42%",
  },
  diagonalGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  refractionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  glossLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  divider: {
    height: 1,
    marginLeft: 26,
    marginRight: 12,
    backgroundColor: "rgba(41, 54, 68, 0.2)",
  },
});
