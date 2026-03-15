import { Text } from "@/design-system/primitives/text";
import { useEffect, useMemo } from "react";
import { Animated, Modal, Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Elevation } from "@/design-system/tokens/elevation";
import REACTION_EMOJIS from "./emojis.json";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmojiOption = {
  emoji: string;
  name: string;
};

export type ReactionPickerProps = {
  visible: boolean;
  anchorY: number;
  anchorX: number;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReactionPicker({
  visible,
  anchorY,
  anchorX,
  onSelect,
  onClose,
}: ReactionPickerProps) {
  const scale = useMemo(() => new Animated.Value(0), []);
  const opacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [opacity, scale, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            {
              top: anchorY - 20,
              left: anchorX,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          {REACTION_EMOJIS.map((item: EmojiOption) => (
            <Pressable
              key={item.name}
              onPress={() => {
                onSelect(item.emoji);
                onClose();
              }}
              style={({ pressed }) => [
                styles.emojiButton,
                pressed && styles.emojiButtonPressed,
              ]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  container: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: ColorPalette.white,
    borderRadius: CornerRadius.lg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 2,
    ...Elevation.md,
  },
  emojiButton: {
    width: 40,
    height: 45,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiButtonPressed: {
    backgroundColor: ColorPalette.secondaryBackground,
  },
  emoji: {
    fontSize: 20,
    padding: 4,
  },
});
