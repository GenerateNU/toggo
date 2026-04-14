import {
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CoreSize } from "@/design-system/tokens/core-size";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout, ModalHandle } from "@/design-system/tokens/layout";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import BottomSheetModal from "../bottom-sheet/bottom-sheet";
import Comment, { CommentData } from "./comment";
import { Spinner } from "@/design-system";

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
const SNAP_POINTS = ["90%"];

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = ({ loading }: { loading: boolean }) =>
  loading ? (
    <Box style={styles.emptyContainer}>
      <Spinner />
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
      <Spinner />
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
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const charsRemaining = 500 - inputText.length;

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

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

  const renderItem = useCallback(
    ({ item }: { item: CommentData }) => (
      <Comment comment={item} onReact={onReact} />
    ),
    [onReact],
  );

  const keyExtractor = useCallback(
    (item: CommentData, index: number) => item.id || String(index),
    [],
  );

  const renderEmpty = useCallback(
    () => <EmptyState loading={isLoading} />,
    [isLoading],
  );

  const renderListFooter = useCallback(
    () => <LoadMoreFooter loading={isLoadingMore} />,
    [isLoadingMore],
  );

  const inputBar = (
    <Box style={styles.inputBar}>
      <Box style={styles.inputRow}>
        <BottomSheetTextInput
          style={styles.input}
          placeholder="Add a comment"
          placeholderTextColor={ColorPalette.gray300}
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
            <Text variant="bodySmMedium" style={{ color: ColorPalette.white }}>
              Send
            </Text>
          </Pressable>
        )}
        {isSubmitting && (
          <Box style={styles.sendButton}>
            <Text variant="bodySmMedium" style={{ color: ColorPalette.white }}>
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
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      onClose={onClose}
      disableScrollView
      footer={inputBar}
      keyboardBehavior="extend"
    >
      {/* Header */}
      <Box style={styles.header}>
        <Pressable onPress={onClose} hitSlop={16}>
          <View style={styles.handle} />
        </Pressable>
        <Text variant="bodyMedium" style={styles.title}>
          Comments
        </Text>
      </Box>

      {/* Comment list */}
      <BottomSheetFlatList
        data={comments}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          comments.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderListFooter}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </BottomSheetModal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
  },
  handle: {
    ...ModalHandle,
    backgroundColor: ColorPalette.gray300,
  },
  title: {
    textAlign: "center",
    flex: 1,
    marginBottom: Layout.spacing.sm,
  },
  listContent: {
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: 100,
    gap: Layout.spacing.sm,
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
    borderColor: ColorPalette.gray200,
    color: ColorPalette.gray900,
  },
  sendButton: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 10,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.blue500,
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
