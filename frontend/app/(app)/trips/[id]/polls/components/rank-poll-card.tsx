import { useSubmitRanking } from "@/api/polls/useSubmitRanking";
import { Box, Text, useToast } from "@/design-system";
import { UserAvatar } from "@/design-system/components/avatars/user-avatar";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { ModelsRankPollResultsResponse } from "@/types/types.gen";
import { GripVertical } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// ─── Types ───────────────────────────────────────────────────────────────────

type RankedOption = {
  id: string;
  name: string;
};

type RankPollCardProps = {
  poll: ModelsRankPollResultsResponse;
  tripId: string;
  onRanked?: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 52;
const RANK_BADGE_SIZE = 28;
const SUBMIT_BUTTON_WIDTH = 147;
const SWAP_THRESHOLD = ITEM_HEIGHT * 0.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPollClosed(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return "Poll closed";
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return `Closes in ${Math.floor(diffMs / 60_000)}m`;
  if (h < 24) return `Closes in ${h}h`;
  return `Closes in ${Math.floor(h / 24)}d`;
}

// ─── Single draggable row ─────────────────────────────────────────────────────

type RowProps = {
  option: RankedOption;
  rank: number;
  isDragging: boolean;
  translateY: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
  closed: boolean;
};

const DraggableRow = React.memo(function DraggableRow({
  option,
  rank,
  isDragging,
  translateY,
  gesture,
  closed,
}: RowProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: isDragging ? translateY.value : 0 },
      {
        scale: withSpring(isDragging ? 1.03 : 1, {
          damping: 20,
          stiffness: 300,
        }),
      },
    ],
    shadowOpacity: isDragging ? 0.15 : 0,
    shadowRadius: isDragging ? 8 : 0,
    shadowOffset: { width: 0, height: isDragging ? 4 : 0 },
    elevation: isDragging ? 6 : 0,
    zIndex: isDragging ? 10 : 0,
  }));

  return (
    <Animated.View style={[styles.row, style]}>
      <Box
        backgroundColor="gray900"
        alignItems="center"
        justifyContent="center"
        style={styles.badge}
      >
        <Text variant="bodySmStrong" style={styles.badgeText}>
          {rank}
        </Text>
      </Box>

      <Text variant="bodySmMedium" style={styles.label} numberOfLines={1}>
        {option.name}
      </Text>

      {!closed && (
        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.handle} hitSlop={12}>
            <GripVertical size={20} color={ColorPalette.gray400} />
          </Animated.View>
        </GestureDetector>
      )}
    </Animated.View>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function RankPollCard({
  poll,
  tripId,
  onRanked,
}: RankPollCardProps) {
  const closed = isPollClosed(poll.deadline);
  const [options, setOptions] = useState<RankedOption[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const submitRanking = useSubmitRanking();
  const toast = useToast();

  // All shared values — safe to use in gesture worklets
  const translateY = useSharedValue(0);
  const activeIndex = useSharedValue(-1);
  const listLength = useSharedValue(0);
  const swapBudget = useSharedValue(0); // accumulated offset from swaps this drag

  useEffect(() => {
    listLength.value = options.length;
  }, [options.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync from server data ────────────────────────────────────────────────

  useEffect(() => {
    const ranking = poll.user_ranking;
    if (ranking && ranking.length > 0) {
      setOptions(
        [...ranking]
          .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0))
          .map((r) => ({ id: r.option_id ?? "", name: r.option_name ?? "" })),
      );
    } else if (poll.all_options && poll.all_options.length > 0) {
      setOptions(
        poll.all_options.map((o) => ({
          id: o.option_id ?? "",
          name: o.name ?? "",
        })),
      );
    }
  }, [poll.all_options, poll.user_ranking]);

  // ─── JS-thread helpers (called via runOnJS) ───────────────────────────────

  const setDragging = useCallback((id: string | null) => setDraggingId(id), []);

  const doSwap = useCallback((from: number, to: number) => {
    setOptions((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length)
        return prev;
      const next = [...prev];
      const tmp = next[from]!;
      next[from] = next[to]!;
      next[to] = tmp;
      return next;
    });
  }, []);

  // ─── Build gesture for each row ───────────────────────────────────────────

  const makeGesture = useCallback(
    (optionId: string, index: number) =>
      Gesture.Pan()
        .onBegin(() => {
          activeIndex.value = index;
          swapBudget.value = 0;
          translateY.value = 0;
          runOnJS(setDragging)(optionId);
        })
        .onUpdate((e) => {
          // Offset relative to item's current settled position
          const relY = e.translationY - swapBudget.value;
          translateY.value = relY;

          const ai = activeIndex.value;
          const len = listLength.value;

          if (relY > SWAP_THRESHOLD && ai < len - 1) {
            activeIndex.value = ai + 1;
            swapBudget.value += ITEM_HEIGHT;
            runOnJS(doSwap)(ai, ai + 1);
          } else if (relY < -SWAP_THRESHOLD && ai > 0) {
            activeIndex.value = ai - 1;
            swapBudget.value -= ITEM_HEIGHT;
            runOnJS(doSwap)(ai, ai - 1);
          }
        })
        .onFinalize(() => {
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
          runOnJS(setDragging)(null);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const pollId = poll.poll_id;
    if (!pollId || closed) return;
    try {
      await submitRanking.mutateAsync({
        tripID: tripId,
        pollId,
        data: {
          rankings: options.map((opt, i) => ({
            option_id: opt.id,
            rank: i + 1,
          })),
        },
      });
      toast.show({
        variant: "pollSent",
        message: hasVoted ? "Ranking updated!" : "Poll Sent!",
        subtitle: "Your trip will get a notification to vote.",
      });
      onRanked?.();
    } catch {
      toast.show({ message: "Failed to submit ranking. Please try again." });
    }
  };

  const hasVoted = poll.user_has_voted ?? false;

  // True when the current order matches the user's saved ranking
  const isUnchanged = useMemo(() => {
    if (!hasVoted || !poll.user_ranking) return false;
    const saved = [...poll.user_ranking]
      .sort((a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0))
      .map((r) => r.option_id ?? "");
    if (options.length !== saved.length) return false;
    // For rankings, order matters — check each position matches
    const savedSet = new Set(saved.map((id, i) => `${i}:${id}`));
    return options.every((opt, i) => savedSet.has(`${i}:${opt.id}`));
  }, [options, poll.user_ranking, hasVoted]);

  const submitDisabled =
    options.length === 0 || submitRanking.isPending || closed || isUnchanged;
  const submitLabel = submitRanking.isPending
    ? "Submitting…"
    : closed
      ? "Poll closed"
      : hasVoted
        ? "Update ranking"
        : "Submit ranking";

  return (
    <Box backgroundColor="white" borderRadius="md" style={styles.card}>
      <Box style={styles.inner}>
        {/* Header */}
        <Box gap="xxs">
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
          <Box flexDirection="row" gap="xs">
            {(poll.total_voters ?? 0) > 0 && (
              <Text variant="bodyXxsDefault" color="gray500">
                {poll.total_voters} voter{poll.total_voters !== 1 ? "s" : ""}
              </Text>
            )}
            {poll.deadline && (
              <Text
                variant="bodyXxsDefault"
                style={{
                  color: closed
                    ? ColorPalette.statusError
                    : ColorPalette.gray500,
                }}
              >
                {(poll.total_voters ?? 0) > 0 ? "· " : ""}
                {formatDeadline(poll.deadline)}
              </Text>
            )}
          </Box>
        </Box>

        {/* Rows */}
        <Box style={styles.list}>
          {options.map((opt, i) => (
            <DraggableRow
              key={opt.id}
              option={opt}
              rank={i + 1}
              isDragging={draggingId === opt.id}
              translateY={translateY}
              gesture={makeGesture(opt.id, i)}
              closed={closed}
            />
          ))}
        </Box>

        {/* Submit */}
        <Box alignItems="flex-end">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitDisabled}
            activeOpacity={0.8}
          >
            <Box
              style={[styles.submit, submitDisabled && styles.submitDisabled]}
            >
              <Text variant="bodyStrong" style={styles.submitLabel}>
                {submitLabel}
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
  card: {
    borderWidth: 1,
    borderColor: ColorPalette.blue100,
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  inner: {
    padding: 12,
    gap: 14,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ColorPalette.gray100,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 10,
    gap: 8,
    height: ITEM_HEIGHT,
  },
  badge: {
    width: RANK_BADGE_SIZE,
    height: RANK_BADGE_SIZE,
    borderRadius: RANK_BADGE_SIZE / 2,
  },
  badgeText: {
    color: ColorPalette.white,
  },
  label: {
    flex: 1,
    color: ColorPalette.gray700,
  },
  handle: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  submit: {
    width: SUBMIT_BUTTON_WIDTH,
    backgroundColor: ColorPalette.brand500,
    borderRadius: CornerRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  submitDisabled: {
    backgroundColor: ColorPalette.gray300,
  },
  submitLabel: {
    color: ColorPalette.white,
  },
});
