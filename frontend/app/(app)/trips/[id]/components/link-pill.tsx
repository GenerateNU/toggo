import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { ExternalLink, Link as LinkIcon, PenLine } from "lucide-react-native";
import { useRef, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type LinkPillProps = {
  url: string;
  onEdit: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function LinkPill({ url, onEdit }: LinkPillProps) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverY, setPopoverY] = useState(0);
  const pillRef = useRef<View>(null);

  const handlePress = () => {
    pillRef.current?.measureInWindow((_x, y, _w, h) => {
      setPopoverY(y + h + 4);
      setPopoverVisible(true);
    });
  };

  return (
    <View ref={pillRef}>
      <Pressable style={styles.pill} onPress={handlePress}>
        <LinkIcon size={14} color={ColorPalette.blue500} />
        <Text style={styles.pillText} numberOfLines={1}>
          {url}
        </Text>
      </Pressable>

      <Modal
        visible={popoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPopoverVisible(false)}
      >
        <Pressable
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.1)" },
          ]}
          onPress={() => setPopoverVisible(false)}
        />
        <View style={[styles.popover, { top: popoverY }]}>
          <Pressable
            style={styles.popoverItem}
            onPress={() => {
              setPopoverVisible(false);
              Linking.openURL(url);
            }}
          >
            <ExternalLink size={16} color={ColorPalette.gray900} />
            <Text variant="bodyDefault" color="gray900">
              Open link
            </Text>
          </Pressable>
          <Box style={styles.popoverDivider} />
          <Pressable
            style={styles.popoverItem}
            onPress={() => {
              setPopoverVisible(false);
              onEdit();
            }}
          >
            <PenLine size={16} color={ColorPalette.gray900} />
            <Text variant="bodyDefault" color="gray900">
              Edit link
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    backgroundColor: ColorPalette.gray25,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pillText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.blue500,
  },
  popover: {
    position: "absolute",
    left: Layout.spacing.sm,
    right: Layout.spacing.sm,
    backgroundColor: ColorPalette.white,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 14,
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ColorPalette.gray100,
    marginHorizontal: Layout.spacing.sm,
  },
});
