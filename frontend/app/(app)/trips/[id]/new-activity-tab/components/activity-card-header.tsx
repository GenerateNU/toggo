import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Ellipsis } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { ACTIVITY_CONFIG, CHIP_ICON_SIZE, MENU_ICON_SIZE } from "../constants";
import type { ActivityCardHeaderProps } from "../types";
import ActivityContextMenu from "./activity-context-menu";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActivityCardHeader({
  activityType,
  timestamp,
  isUnread,
  onMarkRead,
  goToLabel,
  onGoTo,
}: ActivityCardHeaderProps) {
  const config = ACTIVITY_CONFIG[activityType];
  const Icon = config.icon;
  const { width: screenWidth } = useWindowDimensions();

  const menuButtonRef = useRef<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const handleMenuPress = useCallback(() => {
    menuButtonRef.current?.measureInWindow(
      (x: number, y: number, w: number, h: number) => {
        setMenuPosition({
          top: y + h,
          right: screenWidth - (x + w),
        });
        setMenuVisible(true);
      },
    );
  }, [screenWidth]);

  const hasMenu = onMarkRead || onGoTo;

  return (
    <>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Box style={styles.chip}>
            <Icon size={CHIP_ICON_SIZE} color={ColorPalette.blue500} />
            <Text variant="bodySmMedium" style={styles.chipText}>
              {config.label}
            </Text>
          </Box>
          <Text variant="bodySmDefault" color="gray400">
            {formatRelativeTime(timestamp)}
          </Text>
        </Box>
        {hasMenu && (
          <Pressable
            ref={menuButtonRef}
            onPress={handleMenuPress}
            hitSlop={Layout.spacing.xs}
            accessibilityRole="button"
            accessibilityLabel="Activity options"
          >
            <Ellipsis size={MENU_ICON_SIZE} color={ColorPalette.gray400} />
          </Pressable>
        )}
      </Box>

      <ActivityContextMenu
        visible={menuVisible}
        goToLabel={goToLabel ?? "Go to item"}
        anchorPosition={menuPosition}
        onClose={() => setMenuVisible(false)}
        onMarkRead={isUnread ? onMarkRead : undefined}
        onGoTo={onGoTo}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xxs,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xxs + 2, // 6px per Figma
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.blue25,
  },
  chipText: {
    color: ColorPalette.blue500,
  },
});
