import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useCallback, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Comment, { CommentData } from "./comment";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CommentSectionProps = {
  visible: boolean;
  onClose: () => void;
  comments: CommentData[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserSeed?: string;
  onSubmitComment: (comment: CommentData) => void;
  onReact: (commentId: string, emoji: string) => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const INPUT_FONT_SIZE = 15;
const INPUT_LINE_HEIGHT = 20;
const INPUT_PADDING_VERTICAL = 10;

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = () => (
  <Box style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>📮</Text>
    <Text variant="smParagraph" color="textQuaternary">
      No comments yet... be the first
    </Text>
  </Box>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommentSection({
  visible,
  onClose,
  comments,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserSeed,
  onSubmitComment,
  onReact,
}: CommentSectionProps) {
  const [inputText, setInputText] = useState("");
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState({ y: 0, x: 0 });

  const charsRemaining = 500 - inputText.length;

  const handleSubmit = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newComment: CommentData = {
      id: Date.now().toString(),
      authorName: currentUserName,
      authorAvatar: currentUserAvatar,
      authorSeed: currentUserSeed ?? currentUserId,
      body: trimmed,
      timestamp: "now",
      reactions: [],
    };

    onSubmitComment(newComment);
    setInputText("");
  }, [
    inputText,
    onSubmitComment,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    currentUserSeed,
  ]);

  const handleOpenPicker = useCallback(
    (commentId: string, y: number, x: number) => {
      setPickerAnchor({ y, x });
      setActivePickerId(commentId);
    },
    [],
  );

  const handleClosePicker = useCallback(() => {
    setActivePickerId(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CommentData }) => (
      <Comment
        comment={item}
        pickerOpen={activePickerId === item.id}
        onOpenPicker={handleOpenPicker}
        onClosePicker={handleClosePicker}
        pickerAnchor={pickerAnchor}
        onReact={onReact}
      />
    ),
    [
      onReact,
      activePickerId,
      pickerAnchor,
      handleOpenPicker,
      handleClosePicker,
    ],
  );

  const keyExtractor = useCallback((item: CommentData) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <Box style={styles.header}>
          <View style={styles.handle} />
          <Text variant="smHeading" color="textSecondary" style={styles.title}>
            Comments
          </Text>
        </Box>

        {/* Comment list */}
        <FlatList
          data={comments}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            comments.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Input bar */}
        <Box style={styles.inputBar}>
          <Box style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment"
              placeholderTextColor={ColorPalette.textQuaternary}
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="default"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            {inputText.trim().length > 0 && (
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                ]}
              >
                <Text variant="smLabel" style={{ color: ColorPalette.white }}>
                  Send
                </Text>
              </Pressable>
            )}
          </Box>
          {charsRemaining <= 100 && (
            <Text
              variant="xsLabel"
              style={[
                styles.charCount,
                charsRemaining <= 20 && styles.charCountUrgent,
              ]}
            >
              {charsRemaining} characters remaining
            </Text>
          )}
        </Box>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorPalette.white,
    borderTopLeftRadius: CornerRadius.lg,
    borderTopRightRadius: CornerRadius.lg,
  },
  header: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: ColorPalette.borderPrimary,
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  inputBar: {
    gap: 6,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.borderSecondary,
    backgroundColor: ColorPalette.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    lineHeight: INPUT_LINE_HEIGHT,
    paddingTop: INPUT_PADDING_VERTICAL,
    paddingBottom: INPUT_PADDING_VERTICAL,
    paddingHorizontal: 14,
    borderRadius: CornerRadius.md,
    borderWidth: 1,
    borderColor: ColorPalette.borderPrimary,
    color: ColorPalette.textSecondary,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.black,
    marginBottom: Platform.OS === "ios" ? 0 : 1,
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  charCount: {
    color: ColorPalette.textQuaternary,
    textAlign: "right",
  },
  charCountUrgent: {
    color: ColorPalette.brandPrimary,
  },
});
