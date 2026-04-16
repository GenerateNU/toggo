import { BackButton, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { MoreHorizontal } from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MenuAction = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  isDanger?: boolean;
};

type DetailHeaderProps = {
  title: string;
  onBack?: () => void;
  menuActions?: MenuAction[];
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DetailHeader({
  title,
  onBack,
  menuActions = [],
}: DetailHeaderProps) {
  const { top } = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuY, setMenuY] = useState(0);
  const moreBtnRef = useRef<View>(null);

  const handleMorePress = () => {
    moreBtnRef.current?.measureInWindow((_x, y, _w, h) => {
      setMenuY(y + h + 4);
      setIsMenuVisible(true);
    });
  };

  return (
    <View style={[styles.header, { paddingTop: top + 8 }]}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={styles.sideButton}
      >
        <BackButton hasBackground />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {menuActions.length > 0 ? (
        <View ref={moreBtnRef} style={styles.sideButton}>
          <Pressable onPress={handleMorePress} hitSlop={8}>
            <MoreHorizontal size={20} color={ColorPalette.gray950} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.sideButton} />
      )}

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <Pressable
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.1)" },
          ]}
          onPress={() => setIsMenuVisible(false)}
        />
        <View style={[styles.menu, { top: menuY }]}>
          {menuActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Pressable
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  action.onPress();
                }}
              >
                <Icon
                  size={16}
                  color={
                    action.isDanger
                      ? ColorPalette.statusError
                      : ColorPalette.gray950
                  }
                />
                <Text
                  style={[
                    styles.menuItemText,
                    action.isDanger && styles.menuItemDangerText,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: 12,
    backgroundColor: ColorPalette.white,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
    color: ColorPalette.gray950,
  },
  sideButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    right: Layout.spacing.sm,
    backgroundColor: ColorPalette.white,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    minWidth: 180,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 14,
  },
  menuItemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: ColorPalette.gray950,
  },
  menuItemDangerText: {
    color: ColorPalette.statusError,
  },
});
