import { Avatar } from "@/design-system/components/avatars/avatar";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { SmilePlus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import EmojiPicker, { type EmojiType } from "rn-emoji-keyboard";

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
    {reaction.count > 1 && (
      <Text
        variant={reaction.reactedByMe ? "bodyXsMedium" : "bodyXsDefault"}
        style={{
          color: reaction.reactedByMe
            ? ColorPalette.blue500
            : ColorPalette.gray950,
        }}
      >
        {reaction.count}
      </Text>
    )}
  </Pressable>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function Comment({ comment, onReact }: CommentProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleEmojiSelect = (emojiData: EmojiType) => {
    onReact(comment.id, emojiData.emoji);
    setPickerOpen(false);
  };

  const hasReactions = comment.reactions.length > 0;

  return (
    <>
      <Pressable onLongPress={() => setPickerOpen(true)} delayLongPress={400}>
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
              <Text variant="bodyStrong" color="gray900">
                {comment.authorName}
              </Text>
              <Text variant="bodyDefault" style={styles.timestamp}>
                {comment.timestamp}
              </Text>
            </Box>

            {/* Body */}
            <Text variant="bodyDefault" color="gray900">
              {comment.body}
            </Text>

            {/* Reactions row */}
            {hasReactions && (
              <Box style={styles.reactionsRow}>
                {comment.reactions.map((r) => (
                  <ReactionBadge
                    key={r.emoji}
                    reaction={r}
                    onPress={() => onReact(comment.id, r.emoji)}
                  />
                ))}

                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.addReactionButton,
                    pressed && styles.addReactionButtonPressed,
                  ]}
                >
                  <SmilePlus size={16} color={ColorPalette.gray500} />
                </Pressable>
              </Box>
            )}
          </Box>
        </Box>
      </Pressable>

      <EmojiPicker
        onEmojiSelected={handleEmojiSelect}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        enableSearchBar
        enableSearchAnimation={false}
        enableCategoryChangeAnimation={false}
        expandable={false}
        defaultHeight="50%"
        disableSafeArea
        theme={{
          backdrop: "rgba(0,0,0,0.3)",
          knob: ColorPalette.gray300,
          container: ColorPalette.white,
          header: ColorPalette.gray500,
          category: {
            icon: ColorPalette.gray400,
            iconActive: ColorPalette.gray900,
            container: ColorPalette.white,
            containerActive: ColorPalette.gray100,
          },
          search: {
            background: ColorPalette.gray50,
            text: ColorPalette.gray900,
            placeholder: ColorPalette.gray400,
            icon: ColorPalette.gray400,
          },
          emoji: { selected: ColorPalette.gray100 },
        }}
        styles={{
          container: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
          knob: { marginTop: 8 },
          searchBar: {
            container: { marginBottom: 8, borderRadius: 10 },
          },
        }}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: CornerRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ColorPalette.gray50,
  },
  reactionBadgeActive: {
    backgroundColor: ColorPalette.blue25,
    borderColor: ColorPalette.blue500,
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
    backgroundColor: ColorPalette.gray50,
  },
  addReactionButtonPressed: {
    backgroundColor: ColorPalette.gray200,
  },
  timestamp: {
    color: "#A9A9A9",
  },
});
