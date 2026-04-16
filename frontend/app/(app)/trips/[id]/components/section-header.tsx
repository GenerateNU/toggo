import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { Pressable, StyleSheet } from "react-native";

// ─── SectionHeader ────────────────────────────────────────────────────────────

type SectionHeaderProps = {
  label: string;
  onEdit?: () => void;
};

export function SectionHeader({ label, onEdit }: SectionHeaderProps) {
  return (
    <Box flexDirection="row" justifyContent="space-between" alignItems="center">
      <Text style={styles.label}>{label}</Text>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={8}>
          <Text style={styles.editButton}>Edit</Text>
        </Pressable>
      )}
    </Box>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider() {
  return <Box style={styles.divider} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lx,
    lineHeight: 24,
    color: ColorPalette.gray950,
  },
  editButton: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: ColorPalette.blue500,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ColorPalette.gray100,
  },
});
