import { useCastVote } from "@/api/polls/useCastVote";
import { Box, Text, useToast } from "@/design-system";
import { UserAvatar } from "@/design-system/components/avatars/user-avatar";
import { RadioDot } from "@/design-system/components/buttons/radio";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import { Check, UserRound } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type VotePollCardProps = {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onVoted?: () => void;
  onPress?: () => void;
  previewMode?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPollClosed(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Poll closed";

  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) {
    const diffM = Math.floor(diffMs / (1000 * 60));
    return `Closes in ${diffM}m`;
  }
  if (diffH < 24) return `Closes in ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Closes in ${diffD}d`;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHECKBOX_SIZE = 20;
const SUBMIT_BUTTON_WIDTH = 147;
const SUBMIT_BUTTON_PREVIEW_WIDTH = 228;
const PREVIEW_AVATAR_SIZE = 32;

// ─── Checkbox Indicator ───────────────────────────────────────────────────────

const CheckboxIndicator = React.memo(
  ({ selected, disabled }: { selected: boolean; disabled: boolean }) => (
    <Box
      style={[
        styles.checkbox,
        selected
          ? disabled
            ? styles.checkboxDisabled
            : styles.checkboxSelected
          : disabled
            ? styles.checkboxDisabled
            : styles.checkboxUnselected,
      ]}
      alignItems="center"
      justifyContent="center"
    >
      {selected && (
        <Check size={12} color={ColorPalette.white} strokeWidth={3} />
      )}
    </Box>
  ),
);
CheckboxIndicator.displayName = "CheckboxIndicator";

// ─── Component ───────────────────────────────────────────────────────────────

export default function VotePollCard({
  poll,
  tripId,
  onVoted,
  onPress,
  previewMode = false,
}: VotePollCardProps) {
  const isMulti = poll.poll_type === "multi";
  const closed = isPollClosed(poll.deadline);

  // Derive the server-confirmed voted option IDs from the poll prop
  const serverVotedIds = useMemo(
    () => poll.options?.filter((o) => o.voted).map((o) => o.id ?? "") ?? [],
    [poll.options],
  );

  const hasVoted = serverVotedIds.length > 0;

  // Local selection state — initialized from server vote, synced on prop change
  const [selectedIds, setSelectedIds] = useState<string[]>(serverVotedIds);

  useEffect(() => {
    setSelectedIds(serverVotedIds);
  }, [serverVotedIds]);

  // True when selection is identical to what's already on the server
  const isUnchanged = useMemo(() => {
    if (!hasVoted || selectedIds.length !== serverVotedIds.length) return false;
    const saved = new Set(serverVotedIds);
    return selectedIds.every((id) => saved.has(id));
  }, [selectedIds, serverVotedIds, hasVoted]);

  const castVote = useCastVote();
  const toast = useToast();

  const toggleOption = (optionId: string) => {
    if (closed || castVote.isPending) return;
    if (isMulti) {
      setSelectedIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    } else {
      setSelectedIds([optionId]);
    }
  };

  const handleSubmit = async () => {
    if (previewMode) return;
    if (!poll.id || closed) return;
    try {
      await castVote.mutateAsync({
        tripID: tripId,
        pollId: poll.id,
        data: { option_ids: selectedIds },
      });
      toast.show({
        message: hasVoted ? "Vote updated!" : "Vote submitted!",
      });
      onVoted?.();
    } catch {
      toast.show({ message: "Failed to submit vote. Please try again." });
    }
  };

  const totalVotes =
    poll.options?.reduce((sum, o) => sum + (o.vote_count ?? 0), 0) ?? 0;

  const submitLabel = () => {
    if (previewMode) return "Submit vote";
    if (castVote.isPending) return "Voting…";
    if (closed) return "Poll closed";
    if (hasVoted) return "Update vote";
    return "Submit vote";
  };

  const submitDisabled = previewMode
    ? selectedIds.length === 0 || closed
    : selectedIds.length === 0 || castVote.isPending || closed || isUnchanged;

  return (
    <Box backgroundColor="white" borderRadius="md" style={styles.cardShadow}>
      <Box style={styles.cardInner}>
        {/* Question + avatar */}
        <Pressable onPress={onPress} disabled={!onPress || previewMode}>
          <Box gap="xs">
            <Box flexDirection="row" alignItems="flex-start" gap="xs">
              <Text
                variant="bodyDefault"
                color="gray950"
                numberOfLines={3}
                style={{ flex: 1 }}
              >
                {poll.question}
              </Text>
              {previewMode ? (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  style={styles.previewAvatar}
                >
                  <UserRound size={16} color={ColorPalette.statusError} />
                </Box>
              ) : (
                <UserAvatar variant="sm" userId={poll.created_by ?? ""} />
              )}
            </Box>
            {poll.deadline && (
              <Text
                variant="bodyXxsDefault"
                style={{
                  color: closed
                    ? ColorPalette.statusError
                    : ColorPalette.gray500,
                }}
              >
                {formatDeadline(poll.deadline)}
              </Text>
            )}
          </Box>
        </Pressable>

        {/* Options */}
        <Box style={[styles.optionsList, isMulti && styles.optionsListMulti]}>
          {poll.options?.map((option) => {
            const optionId = option.id ?? "";
            const isSelected = selectedIds.includes(optionId);
            const voteCount = option.vote_count ?? 0;
            const votePct =
              totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

            return (
              <Pressable
                key={optionId}
                onPress={() => toggleOption(optionId)}
                disabled={closed || castVote.isPending}
                style={[
                  styles.optionRow,
                  isMulti && styles.optionRowMulti,
                  !isMulti &&
                    (isSelected
                      ? closed
                        ? styles.optionRowSelectedClosed
                        : styles.optionRowSelected
                      : styles.optionRowUnselected),
                ]}
              >
                {isMulti ? (
                  <CheckboxIndicator selected={isSelected} disabled={closed} />
                ) : (
                  <RadioDot selected={isSelected} disabled={closed} />
                )}
                <Text
                  variant="bodySmMedium"
                  style={[
                    styles.optionLabel,
                    {
                      color: isSelected
                        ? closed
                          ? ColorPalette.gray400
                          : ColorPalette.gray900
                        : ColorPalette.gray700,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {option.name}
                </Text>
                {totalVotes > 0 && (
                  <Text
                    variant="bodyXsDefault"
                    style={{
                      color: isSelected
                        ? closed
                          ? ColorPalette.gray400
                          : ColorPalette.gray500
                        : ColorPalette.gray500,
                    }}
                  >
                    {votePct}%
                  </Text>
                )}
              </Pressable>
            );
          })}
        </Box>

        {/* Submit */}
        <Box alignItems="flex-end" style={{ marginTop: Layout.spacing.xxs }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitDisabled}
            activeOpacity={0.8}
          >
            <Box
              style={[
                styles.submitButton,
                previewMode && styles.submitButtonPreview,
                submitDisabled && styles.submitButtonDisabled,
              ]}
            >
              <Text variant="bodyStrong" style={styles.submitLabel}>
                {submitLabel()}
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardShadow: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardInner: {
    padding: 22,
    gap: 18,
  },
  optionsList: {
    gap: 14,
  },
  optionsListMulti: {
    gap: 4,
  },
  optionRowMulti: {
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: Layout.spacing.xs,
  },
  optionRowSelected: {
    backgroundColor: ColorPalette.blue50,
    borderWidth: 1.5,
    borderColor: ColorPalette.blue500,
  },
  optionRowSelectedClosed: {
    backgroundColor: ColorPalette.gray200,
  },
  optionRowUnselected: {
    backgroundColor: ColorPalette.gray25,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  checkboxSelected: {
    backgroundColor: ColorPalette.blue500,
    borderColor: ColorPalette.blue500,
  },
  checkboxUnselected: {
    borderColor: ColorPalette.gray400,
    backgroundColor: ColorPalette.transparent,
  },
  checkboxDisabled: {
    borderColor: ColorPalette.gray300,
    backgroundColor: ColorPalette.gray200,
  },
  optionLabel: {
    flex: 1,
  },
  previewAvatar: {
    width: PREVIEW_AVATAR_SIZE,
    height: PREVIEW_AVATAR_SIZE,
    borderRadius: PREVIEW_AVATAR_SIZE / 2,
    backgroundColor: ColorPalette.statusError + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    width: SUBMIT_BUTTON_WIDTH,
    backgroundColor: ColorPalette.brand500,
    borderRadius: CornerRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Layout.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonPreview: {
    width: SUBMIT_BUTTON_PREVIEW_WIDTH,
    borderRadius: 28,
    paddingVertical: 18,
  },
  submitButtonDisabled: {
    backgroundColor: ColorPalette.gray300,
  },
  submitLabel: {
    color: ColorPalette.white,
  },
});
