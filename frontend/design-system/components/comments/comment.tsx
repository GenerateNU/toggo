import { Avatar } from "@/design-system/components/avatars/avatar";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Smile } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { withOpacity } from "../../utils/color";
import ReactionPicker from "./reaction-picker";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Reaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type CommentData = {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorSeed?: string;
  body: string;
  timestamp: string;
  reactions: Reaction[];
};

export type CommentProps = {
  comment: CommentData;
  pickerOpen: boolean;
  onOpenPicker: (commentId: string, y: number, x: number) => void;
  onClosePicker: () => void;
  pickerAnchor: { y: number; x: number };
  onReact: (commentId: string, emoji: string) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ReactionBadge = ({
  reaction,
  onPress,
}: {
  reaction: Reaction;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.reactionBadge,
      reaction.reactedByMe && styles.reactionBadgeActive,
    ]}
  >
    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
    <Text
      variant="bodyXsMedium"
      style={{
        color: reaction.reactedByMe
          ? ColorPalette.brandPrimary
          : ColorPalette.textSubtle,
      }}
    >
      {reaction.count}
    </Text>
  </Pressable>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function Comment({
  comment,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  pickerAnchor,
  onReact,
}: CommentProps) {
  const anchorRef = useRef<View>(null);

  const measureAndOpen = () => {
    anchorRef.current?.measureInWindow((x, y) => {
      onOpenPicker(comment.id, y, x);
    });
  };

  const handleLongPress = () => measureAndOpen();

  const handleSmilePress = () => {
    if (pickerOpen) {
      onClosePicker();
    } else {
      measureAndOpen();
    }
  };

  const hasReactions = comment.reactions.length > 0;

  return (
    <View>
      <Pressable onLongPress={handleLongPress} delayLongPress={400}>
        <Box style={styles.container}>
          {/* Avatar */}
          <Avatar
            variant="sm"
            seed={comment.authorSeed ?? comment.authorName}
            profilePhoto={comment.authorAvatar}
          />

          {/* Content */}
          <Box style={styles.content}>
            {/* Header */}
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Text
                variant="bodySmMedium"
                color="textInverse"
                style={styles.authorName}
              >
                {comment.authorName}
              </Text>
              <Text variant="bodyXsMedium" color="textSubtle">
                {comment.timestamp}
              </Text>
            </Box>

            {/* Body */}
            <Text variant="bodySmDefault" color="textInverse">
              {comment.body}
            </Text>

            {/*
              Invisible anchor point — sits right after the body text so the
              picker always appears at the same vertical position regardless
              of whether the reactions row is rendered.
            */}
            <View ref={anchorRef} collapsable={false} />

            {/* Reactions row (shown only when reactions exist) */}
            {hasReactions && (
              <Box style={styles.reactionsRow}>
                {comment.reactions.map((r) => (
                  <ReactionBadge
                    key={r.emoji}
                    reaction={r}
                    onPress={() => onReact(comment.id, r.emoji)}
                  />
                ))}

                {/* Add reaction button */}
                <Pressable
                  onPress={handleSmilePress}
                  style={({ pressed }) => [
                    styles.addReactionButton,
                    pressed && styles.addReactionButtonPressed,
                  ]}
                >
                  <Smile size={16} color={ColorPalette.textSubtle} />
                </Pressable>
              </Box>
            )}
          </Box>
        </Box>
      </Pressable>

      {/* Picker rendered as its own modal */}
      <ReactionPicker
        visible={pickerOpen}
        anchorY={pickerAnchor.y}
        anchorX={pickerAnchor.x}
        onSelect={(emoji) => onReact(comment.id, emoji)}
        onClose={onClosePicker}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  authorName: {
    fontWeight: "600",
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: CornerRadius.full,
    backgroundColor: ColorPalette.backgroundSubtle,
  },
  reactionBadgeActive: {
    backgroundColor: withOpacity(ColorPalette.brandPrimary, 0.12),
    borderWidth: 1,
    borderColor: ColorPalette.brandPrimary,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  addReactionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ColorPalette.backgroundSubtle,
  },
  addReactionButtonPressed: {
    backgroundColor: ColorPalette.backgroundMuted,
  },
});
