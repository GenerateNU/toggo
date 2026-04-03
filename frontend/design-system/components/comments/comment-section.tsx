import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CoreSize } from "@/design-system/tokens/core-size";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout, ModalHandle } from "@/design-system/tokens/layout";
import { X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSubmitComment: (comment: CommentData) => Promise<void>;
  onReact: (commentId: string, emoji: string) => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const INPUT_FONT_SIZE = 15;
const INPUT_LINE_HEIGHT = 20;
const INPUT_PADDING_VERTICAL = 10;

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = ({ loading }: { loading: boolean }) =>
  loading ? (
    <Box style={styles.emptyContainer}>
      <ActivityIndicator color={ColorPalette.gray500} />
    </Box>
  ) : (
    <Box style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📮</Text>
      <Text variant="bodySmDefault" color="gray500">
        No comments yet... be the first
      </Text>
    </Box>
  );

const LoadMoreFooter = ({ loading }: { loading: boolean }) =>
  loading ? (
    <Box style={styles.loadMoreFooter}>
      <ActivityIndicator size="small" color={ColorPalette.gray500} />
    </Box>
  ) : null;

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommentSection({
  visible,
  onClose,
  comments,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserSeed,
  isLoading = false,
  isLoadingMore = false,
  onLoadMore,
  onSubmitComment,
  onReact,
}: CommentSectionProps) {
  const [inputText, setInputText] = useState("");
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState({ y: 0, x: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const charsRemaining = 500 - inputText.length;

  const handleSubmit = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSubmitting) return;

    const newComment: CommentData = {
      id: Date.now().toString(),
      authorName: currentUserName,
      authorAvatar: currentUserAvatar,
      authorSeed: currentUserSeed ?? currentUserId,
      body: trimmed,
      timestamp: "now",
      reactions: [],
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmitComment(newComment);
      setInputText(""); // Only clear on success
    } catch {
      setSubmitError("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    inputText,
    isSubmitting,
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

  const handleModalClose = useCallback(() => {
    // Reset picker state when modal closes
    setActivePickerId(null);
    setPickerAnchor({ y: 0, x: 0 });
    onClose();
  }, [onClose]);

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

  const keyExtractor = useCallback(
    (item: CommentData, index: number) => item.id || String(index),
    [],
  );

  const renderEmpty = useCallback(
    () => <EmptyState loading={isLoading} />,
    [isLoading],
  );

  const renderFooter = useCallback(
    () => <LoadMoreFooter loading={isLoadingMore} />,
    [isLoadingMore],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 65 : 0}
      >
        {/* Header */}
        <Box style={styles.header}>
          <Pressable
            onPress={handleModalClose}
            hitSlop={16}
            style={styles.handlePressable}
          >
            <View style={styles.handle} />
          </Pressable>
          <Text variant="bodySmStrong" color="white" style={styles.title}>
            Comments
          </Text>
          <Pressable
            onPress={handleModalClose}
            style={styles.closeButton}
            hitSlop={16}
            accessibilityLabel="Close comments"
          >
            <X size={24} color={ColorPalette.gray500} />
          </Pressable>
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
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Input bar */}
        <Box style={styles.inputBar}>
          <Box style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment"
              placeholderTextColor={ColorPalette.gray500}
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="default"
              multiline
              scrollEnabled={false}
              maxLength={500}
            />
            {inputText.trim().length > 0 && !isSubmitting && (
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                ]}
              >
                <Text
                  variant="bodySmMedium"
                  style={{ color: ColorPalette.white }}
                >
                  Send
                </Text>
              </Pressable>
            )}
            {isSubmitting && (
              <Box style={styles.sendButton}>
                <Text
                  variant="bodySmMedium"
                  style={{ color: ColorPalette.white }}
                >
                  ...
                </Text>
              </Box>
            )}
          </Box>
          {submitError && (
            <Text variant="bodyXsMedium" style={styles.errorText}>
              {submitError}
            </Text>
          )}
          {charsRemaining <= 100 && !submitError && (
            <Text
              variant="bodyXsMedium"
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
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: Layout.spacing.md,
  },
  handlePressable: {
    paddingVertical: Layout.spacing.xs,
  },
  handle: {
    ...ModalHandle,
    backgroundColor: ColorPalette.gray300,
  },
  title: {
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    right: Layout.spacing.md,
    top: 20,
  },
  listContent: {
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: CoreSize.xl,
    lineHeight: CoreSize.xl + 16,
  },
  loadMoreFooter: {
    paddingVertical: Layout.spacing.sm,
    alignItems: "center",
  },
  inputBar: {
    gap: 6,
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: 10,
    paddingBottom: Layout.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.gray100,
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
    paddingVertical: INPUT_PADDING_VERTICAL,
    paddingHorizontal: 14,
    borderRadius: CornerRadius.md,
    borderWidth: 1,
    borderColor: ColorPalette.gray300,
    color: ColorPalette.gray900,
  },
  sendButton: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 10,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.gray900,
    marginBottom: Platform.OS === "ios" ? 0 : 1,
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  charCount: {
    color: ColorPalette.gray500,
    textAlign: "right",
  },
  charCountUrgent: {
    color: ColorPalette.brand500,
  },
  errorText: {
    color: ColorPalette.statusError,
    textAlign: "right",
  },
});
