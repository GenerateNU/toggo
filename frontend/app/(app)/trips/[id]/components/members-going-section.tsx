import { Box, Text } from "@/design-system";
import { Avatar } from "@/design-system/components/avatars/avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
} from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type GoingUser = {
  user_id?: string;
  name?: string;
  profile_picture_url?: string;
};

type MembersGoingSectionProps = {
  goingUsers: GoingUser[];
  onRemoveMember: (userId: string) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSummaryText(users: GoingUser[]): string {
  if (users.length === 0) return "";
  if (users.length === 1) return users[0]?.name ?? "1 member";
  if (users.length === 2)
    return `${users[0]?.name ?? "Member"} and ${users[1]?.name ?? "1 other"}`;
  const others = users.length - 2;
  return `${users[0]?.name ?? "Member"}, ${users[1]?.name ?? "Member"}, and ${others} other${others !== 1 ? "s" : ""}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MembersGoingSection({
  goingUsers,
  onRemoveMember,
}: MembersGoingSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuConfig, setMenuConfig] = useState<{
    userId: string;
    top: number;
  } | null>(null);
  const moreBtnRefs = useRef<Map<string, View>>(new Map());

  const previewUsers = goingUsers.slice(0, 3);
  const extraCount = Math.max(0, goingUsers.length - 3);

  const handleMorePress = (u: GoingUser) => {
    const ref = moreBtnRefs.current.get(u.user_id ?? "");
    ref?.measureInWindow((_x, y, _w, h) => {
      setMenuConfig({ userId: u.user_id ?? "", top: y + h + 4 });
    });
  };

  return (
    <Box style={styles.section}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.sectionLabel}>Members going</Text>
        {expanded ? (
          <ChevronUp size={20} color={ColorPalette.gray950} />
        ) : (
          <ChevronDown size={20} color={ColorPalette.gray950} />
        )}
      </Pressable>

      {!expanded && goingUsers.length > 0 && (
        <Box style={styles.collapsed}>
          <Box style={styles.avatarStack}>
            {previewUsers.map((u, i) => (
              <Box
                key={u.user_id ?? i}
                style={[
                  styles.avatarStackItem,
                  { zIndex: 3 - i, marginLeft: i === 0 ? 0 : -8 },
                ]}
              >
                <Avatar
                  variant="md"
                  seed={u.user_id ?? u.name ?? String(i)}
                  profilePhoto={u.profile_picture_url ?? undefined}
                />
              </Box>
            ))}
            {extraCount > 0 && (
              <Box style={[styles.extraCount, { marginLeft: -8, zIndex: 0 }]}>
                <Text style={styles.extraCountText}>+{extraCount}</Text>
              </Box>
            )}
          </Box>
          <Text style={styles.summaryText}>{buildSummaryText(goingUsers)}</Text>
        </Box>
      )}

      {expanded && (
        <Box style={styles.membersList}>
          {goingUsers.map((u, i) => (
            <Box key={u.user_id ?? i} style={styles.memberRow}>
              <Avatar
                variant="md"
                seed={u.user_id ?? u.name ?? String(i)}
                profilePhoto={u.profile_picture_url ?? undefined}
              />
              <Text
                variant="bodyMedium"
                color="gray950"
                style={styles.memberName}
              >
                {u.name ?? "Member"}
              </Text>
              <View
                ref={(ref) => {
                  if (ref && u.user_id)
                    moreBtnRefs.current.set(u.user_id, ref as View);
                }}
              >
                <Pressable hitSlop={8} onPress={() => handleMorePress(u)}>
                  <MoreHorizontal size={16} color={ColorPalette.gray950} />
                </Pressable>
              </View>
            </Box>
          ))}
        </Box>
      )}

      {menuConfig && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setMenuConfig(null)}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setMenuConfig(null)}
          />
          <View
            style={[
              styles.removePopover,
              { top: menuConfig.top, right: Layout.spacing.sm },
            ]}
          >
            <Pressable
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              onPress={() => {
                const uid = menuConfig.userId;
                setMenuConfig(null);
                onRemoveMember(uid);
              }}
            >
              <Trash2 size={16} color={ColorPalette.statusError} />
              <Text style={styles.removeText}>Remove member</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { gap: Layout.spacing.xs },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lx,
    lineHeight: 24,
    color: ColorPalette.gray950,
  },
  collapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  avatarStackItem: {},
  extraCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ColorPalette.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  extraCountText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: ColorPalette.gray600,
  },
  summaryText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: ColorPalette.gray600,
  },
  membersList: { gap: 20 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberName: { flex: 1 },
  removePopover: {
    position: "absolute",
    backgroundColor: ColorPalette.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  removeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: ColorPalette.statusError,
  },
});
