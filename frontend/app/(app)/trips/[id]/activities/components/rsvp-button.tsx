import { Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { FontFamily, FontSize } from "@/design-system/tokens/typography";
import { UserPlus, Users } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type RsvpButtonVariant = "card" | "detail";

type RsvpButtonProps = {
  isGoing: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant?: RsvpButtonVariant;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RsvpButton({
  isGoing,
  onPress,
  disabled = false,
  variant = "card",
}: RsvpButtonProps) {
  const isCard = variant === "card";

  return (
    <Pressable
      style={[
        isCard ? styles.cardButton : styles.detailButton,
        isGoing && (isCard ? styles.cardButtonGoing : styles.detailButtonGoing),
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isGoing ? (
        <Users
          size={isCard ? 16 : 14}
          color={isCard ? ColorPalette.statusSuccess : ColorPalette.white}
        />
      ) : (
        <UserPlus size={isCard ? 16 : 14} color={ColorPalette.white} />
      )}
      <Text
        style={[
          isCard ? styles.cardText : styles.detailText,
          isGoing && (isCard ? styles.cardTextGoing : styles.detailTextGoing),
        ]}
      >
        {isGoing ? "Going!" : "I'm going"}
      </Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Card variant ──────────────────────────────────────────────────────────
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ColorPalette.brand500,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  cardButtonGoing: {
    backgroundColor: ColorPalette.white,
    borderWidth: 1,
    borderColor: ColorPalette.gray50,
  },
  cardText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: ColorPalette.white,
    lineHeight: 16,
  },
  cardTextGoing: {
    color: ColorPalette.statusSuccess,
  },

  // ── Detail variant ────────────────────────────────────────────────────────
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    backgroundColor: ColorPalette.gray950,
    borderRadius: 10.5,
    paddingHorizontal: 10.5,
    paddingVertical: 7,
    flexShrink: 0,
  },
  detailButtonGoing: {
    backgroundColor: ColorPalette.brand500,
  },
  detailText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: ColorPalette.white,
  },
  detailTextGoing: {
    color: ColorPalette.white,
  },
});
