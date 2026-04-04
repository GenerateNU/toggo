import { useCastVote } from "@/api/polls/useCastVote";
import { Box, Text, useToast } from "@/design-system";
import { UserAvatar } from "@/design-system/components/avatars/user-avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type VotePollCardProps = {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onVoted?: () => void;
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

const RADIO_OUTER_SIZE = 20;
const RADIO_INNER_SIZE = 12;
const SUBMIT_BUTTON_WIDTH = 147;

// ─── Radio Indicator ─────────────────────────────────────────────────────────

const RadioDot = React.memo(
  ({ selected, disabled }: { selected: boolean; disabled: boolean }) => (
    <Box
      style={[
        styles.radioOuter,
        selected
          ? styles.radioOuterSelected
          : disabled
            ? styles.radioOuterDisabled
            : styles.radioOuterUnselected,
      ]}
    >
      {selected && (
        <Box
          style={[styles.radioInner, disabled && styles.radioInnerDisabled]}
        />
      )}
    </Box>
  ),
);
RadioDot.displayName = "RadioDot";

// ─── Component ───────────────────────────────────────────────────────────────

export default function VotePollCard({
  poll,
  tripId,
  onVoted,
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
    if (!poll.id || closed) return;
    try {
      await castVote.mutateAsync({
        tripID: tripId,
        pollId: poll.id,
        data: { option_ids: selectedIds },
      });
      toast.show({
        variant: "pollSent",
        message: hasVoted ? "Vote updated!" : "Poll Sent!",
        subtitle: "Your trip will get a notification to vote.",
      });
      onVoted?.();
    } catch {
      toast.show({ message: "Failed to submit vote. Please try again." });
    }
  };

  const totalVotes =
    poll.options?.reduce((sum, o) => sum + (o.vote_count ?? 0), 0) ?? 0;

  const submitLabel = () => {
    if (castVote.isPending) return "Voting…";
    if (closed) return "Poll closed";
    if (hasVoted) return "Update vote";
    return "Submit vote";
  };

  const submitDisabled =
    selectedIds.length === 0 || castVote.isPending || closed || isUnchanged;

  return (
    <Box backgroundColor="white" borderRadius="md" style={styles.cardShadow}>
      <Box style={styles.cardInner}>
        {/* Question + avatar */}
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
            <UserAvatar variant="sm" userId={poll.created_by ?? ""} />
          </Box>
          {poll.deadline && (
            <Text
              variant="bodyXxsDefault"
              style={{
                color: closed ? ColorPalette.statusError : ColorPalette.gray500,
              }}
            >
              {formatDeadline(poll.deadline)}
            </Text>
          )}
        </Box>

        {/* Options */}
        <Box style={styles.optionsList}>
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
                  isSelected
                    ? closed
                      ? styles.optionRowSelectedClosed
                      : styles.optionRowSelected
                    : styles.optionRowUnselected,
                ]}
              >
                <RadioDot selected={isSelected} disabled={closed} />
                <Text
                  variant="bodySmMedium"
                  style={[
                    styles.optionLabel,
                    {
                      color: isSelected
                        ? closed
                          ? ColorPalette.gray400
                          : ColorPalette.white
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
                          : ColorPalette.gray300
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
    borderColor: ColorPalette.blue100,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  cardInner: {
    padding: 12,
    gap: Layout.spacing.sm,
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: Layout.spacing.sm,
    gap: Layout.spacing.xs,
  },
  optionRowSelected: {
    backgroundColor: ColorPalette.gray900,
  },
  optionRowSelectedClosed: {
    backgroundColor: ColorPalette.gray500,
  },
  optionRowUnselected: {
    backgroundColor: ColorPalette.gray100,
  },
  radioOuter: {
    width: RADIO_OUTER_SIZE,
    height: RADIO_OUTER_SIZE,
    borderRadius: RADIO_OUTER_SIZE / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: ColorPalette.white,
  },
  radioOuterSelectedClosed: {
    borderColor: ColorPalette.gray400,
  },
  radioOuterUnselected: {
    borderColor: ColorPalette.gray700,
  },
  radioOuterDisabled: {
    borderColor: ColorPalette.gray400,
  },
  radioInner: {
    width: RADIO_INNER_SIZE,
    height: RADIO_INNER_SIZE,
    borderRadius: RADIO_INNER_SIZE / 2,
    backgroundColor: ColorPalette.white,
  },
  radioInnerDisabled: {
    backgroundColor: ColorPalette.gray400,
  },
  optionLabel: {
    flex: 1,
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
  submitButtonDisabled: {
    backgroundColor: ColorPalette.gray300,
  },
  submitLabel: {
    color: ColorPalette.white,
  },
});
