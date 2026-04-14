import { useAddPollOption } from "@/api/polls/useAddPollOption";
import { useDeletePollOption } from "@/api/polls/useDeletePollOption";
import { useDeleteRankPollOption } from "@/api/polls/useDeleteRankPollOption";
import { useGetRankPollResults } from "@/api/polls/useGetRankPollResults";
import { useGetRankPollVoters } from "@/api/polls/useGetRankPollVoters";
import { useGetVoteOptionVoters } from "@/api/polls/useGetVoteOptionVoters";
import { useGetVotePollVoters } from "@/api/polls/useGetVotePollVoters";
import { useUpdatePoll } from "@/api/polls/useUpdatePoll";
import { useUpdateRankPoll } from "@/api/polls/useUpdateRankPoll";
import {
  Avatar,
  Box,
  DashedBorderBox,
  Spinner,
  Text,
  TextField,
  useToast,
} from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { ModelsPollAPIResponse } from "@/types/types.gen";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  Award,
  BarChart2,
  Minus,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react-native";
import { OptionRow, OPTION_LEFT_OFFSET } from "./poll-option-row";
import { PollSettingsPanel } from "./poll-settings-panel";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = "poll" | "responses" | "settings";

type PollDetailSheetProps = {
  poll: ModelsPollAPIResponse | null;
  tripId: string;
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPollClosed(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function isYesNoPoll(poll: ModelsPollAPIResponse): boolean {
  const opts = poll.options ?? [];
  return (
    poll.poll_type === "single" &&
    opts.length === 2 &&
    opts[0]?.name?.toLowerCase() === "yes" &&
    opts[1]?.name?.toLowerCase() === "no"
  );
}

function formatVotedAt(votedAt: string): string {
  return new Date(votedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

const TABS: {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}[] = [
  { key: "poll", label: "Poll", Icon: BarChart2 },
  { key: "responses", label: "Responses", Icon: Users },
  { key: "settings", label: "Settings", Icon: Settings },
];

function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <Box flexDirection="row" gap="xs">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)}>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="xxs"
              paddingHorizontal="sm"
              paddingVertical="xs"
              borderRadius="sm"
              backgroundColor={isActive ? "brand500" : "gray100"}
            >
              <tab.Icon
                size={14}
                color={isActive ? ColorPalette.white : ColorPalette.gray600}
              />
              <Text
                variant="bodySmMedium"
                style={{
                  color: isActive ? ColorPalette.white : ColorPalette.gray600,
                }}
              >
                {tab.label}
              </Text>
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
}

// ─── Option Voter Avatars ─────────────────────────────────────────────────────

function OptionVoterAvatars({
  tripId,
  pollId,
  optionId,
}: {
  tripId: string;
  pollId: string;
  optionId: string;
}) {
  const { data } = useGetVoteOptionVoters(tripId, pollId, optionId, {
    query: { enabled: !!(tripId && pollId && optionId) },
  });

  const voters = data?.voters ?? [];
  if (voters.length === 0) return null;

  const visible = voters.slice(0, 3);
  const overflow = voters.length - 3;

  return (
    <Box flexDirection="row" alignItems="center">
      {visible.map((v, i) => (
        <Box
          key={v.user_id}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
        >
          <Avatar seed={v.user_id ?? ""} variant="xs" />
        </Box>
      ))}
      {overflow > 0 && (
        <Box style={[styles.overflowBadge, { marginLeft: -6 }]}>
          <Text variant="bodyXxsMedium" color="gray700">
            +{overflow}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Poll Tab ─────────────────────────────────────────────────────────────────

function PollTab({
  poll,
  tripId,
  onUpdate,
  onOptionAdded,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onUpdate?: () => void;
  onOptionAdded?: () => void;
}) {
  const closed = isPollClosed(poll.deadline);
  const yesNo = isYesNoPoll(poll);
  const canAddOption = !closed && !yesNo && poll.poll_type !== "rank";
  const canDeleteOption = !closed && (poll.options?.length ?? 0) > 2;
  const [question, setQuestion] = useState(poll.question ?? "");
  const [newOptionText, setNewOptionText] = useState("");
  const addPollOption = useAddPollOption();
  const deletePollOption = useDeletePollOption();
  const deleteRankPollOption = useDeleteRankPollOption();
  const updateVotePoll = useUpdatePoll();
  const updateRankPoll = useUpdateRankPoll();
  const toast = useToast();

  const handleSaveQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed || trimmed === poll.question || !poll.id) return;
    const update = poll.poll_type === "rank" ? updateRankPoll : updateVotePoll;
    try {
      await update.mutateAsync({
        tripID: tripId,
        pollId: poll.id,
        data: { question: trimmed },
      });
      onUpdate?.();
    } catch {
      toast.show({ message: "Failed to save question." });
      setQuestion(poll.question ?? "");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!poll.id) return;
    try {
      if (poll.poll_type === "rank") {
        await deleteRankPollOption.mutateAsync({
          tripID: tripId,
          pollId: poll.id,
          optionId,
        });
      } else {
        await deletePollOption.mutateAsync({
          tripID: tripId,
          pollId: poll.id,
          optionId,
        });
      }
      onUpdate?.();
    } catch {
      toast.show({ message: "Failed to delete option." });
    }
  };

  const handleAddOption = async () => {
    const name = newOptionText.trim();
    if (!name || !poll.id) return;
    try {
      await addPollOption.mutateAsync({
        tripID: tripId,
        pollId: poll.id,
        data: { name, option_type: "custom" },
      });
      setNewOptionText("");
      toast.show({ message: "Option added!" });
      onOptionAdded?.();
    } catch {
      toast.show({ message: "Failed to add option. Try again." });
    }
  };

  return (
    <Box gap="md">
      <TextField
        label="Poll Question"
        value={question}
        onChangeText={setQuestion}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={handleSaveQuestion}
        activeBorderColor={ColorPalette.brand500}
      />

      {(poll.options?.length ?? 0) > 0 && (
        <Box gap="xs">
          <Text variant="bodyXsMedium" color="gray500">
            Options
          </Text>

          <Box gap="sm">
            {poll.options?.map((option, i) => (
              <OptionRow
                key={option.id}
                index={i}
                filled
                right={
                  canDeleteOption && option.id ? (
                    <Pressable
                      onPress={() => handleDeleteOption(option.id!)}
                      hitSlop={8}
                    >
                      <Minus size={18} color={ColorPalette.gray500} />
                    </Pressable>
                  ) : undefined
                }
              >
                <TextField
                  value={option.name ?? ""}
                  onChangeText={() => {}}
                  disabled
                />
              </OptionRow>
            ))}

            {canAddOption &&
              (newOptionText.length > 0 ? (
                <Box gap="xs">
                  <OptionRow
                    index={poll.options?.length ?? 0}
                    filled={newOptionText.trim().length > 0}
                  >
                    <TextField
                      value={newOptionText}
                      onChangeText={setNewOptionText}
                      placeholder="New option..."
                      autoCapitalize="sentences"
                      returnKeyType="done"
                      onSubmitEditing={handleAddOption}
                      activeBorderColor={ColorPalette.brand500}
                    />
                  </OptionRow>
                  <Box flexDirection="row" gap="xs" justifyContent="flex-end">
                    <Pressable onPress={() => setNewOptionText("")}>
                      <Box paddingHorizontal="sm" paddingVertical="xs">
                        <Text variant="bodySmMedium" color="gray500">
                          Cancel
                        </Text>
                      </Box>
                    </Pressable>
                    <Pressable
                      onPress={handleAddOption}
                      disabled={addPollOption.isPending}
                    >
                      <Box
                        paddingHorizontal="md"
                        paddingVertical="xs"
                        borderRadius="md"
                        backgroundColor="brand500"
                      >
                        <Text
                          variant="bodySmMedium"
                          style={{ color: ColorPalette.white }}
                        >
                          {addPollOption.isPending ? "Adding…" : "Add"}
                        </Text>
                      </Box>
                    </Pressable>
                  </Box>
                </Box>
              ) : (
                <Box style={{ marginLeft: OPTION_LEFT_OFFSET }}>
                  <DashedBorderBox
                    dashLength={12}
                    dashGap={6}
                    borderRadius="md"
                  >
                    <Pressable onPress={() => setNewOptionText(" ")}>
                      <Box
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="center"
                        gap="xs"
                        style={{ height: 48 }}
                      >
                        <Plus size={14} color={ColorPalette.gray500} />
                        <Text variant="bodySmDefault" color="gray500">
                          Add option
                        </Text>
                      </Box>
                    </Pressable>
                  </DashedBorderBox>
                </Box>
              ))}
          </Box>
        </Box>
      )}

      {poll.deadline && (
        <Text variant="bodyXxsDefault" color="gray500">
          {isPollClosed(poll.deadline)
            ? "Poll closed"
            : `Closes ${new Date(poll.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        </Text>
      )}
    </Box>
  );
}

// ─── Who Hasn't Voted ─────────────────────────────────────────────────────────

function WhoHasntVoted({
  nonVoters,
}: {
  nonVoters: { user_id?: string; name?: string; username?: string }[];
}) {
  if (nonVoters.length === 0) return null;

  const names = nonVoters
    .map((v) => v.name?.split(" ")[0] ?? v.username ?? "?")
    .join(", ");

  return (
    <Box
      backgroundColor="gray50"
      borderRadius="md"
      paddingHorizontal="sm"
      paddingVertical="sm"
      gap="xs"
      style={styles.nonVotersRow}
    >
      <Text variant="bodyXxsMedium" color="gray500">
        Haven't voted yet
      </Text>
      <Box flexDirection="row" alignItems="center" gap="xs">
        {nonVoters.slice(0, 5).map((v) => (
          <Avatar key={v.user_id} seed={v.user_id ?? ""} variant="xs" />
        ))}
        <Text
          variant="bodyXxsDefault"
          color="gray500"
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {names}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Yes/No Responses ─────────────────────────────────────────────────────────

function YesNoResponsesContent({
  poll,
  tripId,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
}) {
  const { data: votersData } = useGetVotePollVoters(tripId, poll.id ?? "", {
    query: { enabled: !!(tripId && poll.id) },
  });

  const yesOption = poll.options?.find((o) => o.name?.toLowerCase() === "yes");
  const noOption = poll.options?.find((o) => o.name?.toLowerCase() === "no");
  const totalVoted = votersData?.total_voters ?? 0;
  const totalMembers = votersData?.total_members ?? 0;
  const nonVoters = (votersData?.voters ?? []).filter((v) => !v.has_voted);

  return (
    <Box gap="sm">
      <Text variant="bodyXxsDefault" color="gray500">
        {totalVoted}/{totalMembers} voted
      </Text>

      <Box flexDirection="row" gap="sm">
        {/* Yes card */}
        <Box flex={1} borderRadius="lg" style={styles.yesCard} gap="xs">
          <Text variant="bodySmStrong" style={{ color: ColorPalette.brand700 }}>
            Yes
          </Text>
          {!poll.is_anonymous && yesOption?.id && (
            <OptionVoterAvatars
              tripId={tripId}
              pollId={poll.id ?? ""}
              optionId={yesOption.id}
            />
          )}
          <Box flexDirection="row" alignItems="baseline" gap="xxs">
            <Text variant="headingSm" style={{ color: ColorPalette.brand700 }}>
              {yesOption?.vote_count ?? 0}
            </Text>
            <Text
              variant="bodyXsDefault"
              style={{ color: ColorPalette.brand600 }}
            >
              people
            </Text>
          </Box>
        </Box>

        {/* No card */}
        <Box flex={1} borderRadius="lg" style={styles.noCard} gap="xs">
          <Text variant="bodySmStrong" color="gray700">
            No
          </Text>
          {!poll.is_anonymous && noOption?.id && (
            <OptionVoterAvatars
              tripId={tripId}
              pollId={poll.id ?? ""}
              optionId={noOption.id}
            />
          )}
          <Box flexDirection="row" alignItems="baseline" gap="xxs">
            <Text variant="headingSm" color="gray700">
              {noOption?.vote_count ?? 0}
            </Text>
            <Text variant="bodyXsDefault" color="gray500">
              people
            </Text>
          </Box>
        </Box>
      </Box>

      {!poll.is_anonymous && <WhoHasntVoted nonVoters={nonVoters} />}
    </Box>
  );
}

// ─── Vote Poll Responses (single / multi) ─────────────────────────────────────

function VoteResponsesContent({
  poll,
  tripId,
  onSelectOption,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onSelectOption: (id: string) => void;
}) {
  const { data: votersData } = useGetVotePollVoters(tripId, poll.id ?? "", {
    query: { enabled: !!(tripId && poll.id) },
  });

  const totalVoted = votersData?.total_voters ?? 0;
  const totalMembers = votersData?.total_members ?? 0;
  const nonVoters = (votersData?.voters ?? []).filter((v) => !v.has_voted);

  const leaderId = [...(poll.options ?? [])]
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .find((o) => (o.vote_count ?? 0) > 0)?.id;

  return (
    <Box gap="sm">
      <Text variant="bodyXxsDefault" color="gray500">
        {totalVoted}/{totalMembers} voted
      </Text>

      <Box gap="sm">
        {poll.options?.map((option) => {
          const isLeader = option.id === leaderId;
          return (
            <Pressable
              key={option.id}
              onPress={() =>
                !poll.is_anonymous && onSelectOption(option.id ?? "")
              }
              disabled={poll.is_anonymous}
            >
              <Box
                style={[styles.votePill, isLeader && styles.votePillLeader]}
                flexDirection="row"
                alignItems="center"
                paddingHorizontal="md"
                paddingVertical="sm"
              >
                <Text
                  variant="bodySmMedium"
                  color="gray900"
                  style={{ flex: 1 }}
                  numberOfLines={1}
                >
                  {option.name}
                </Text>
                {!poll.is_anonymous && option.id && (
                  <OptionVoterAvatars
                    tripId={tripId}
                    pollId={poll.id ?? ""}
                    optionId={option.id}
                  />
                )}
                <Text variant="bodySmStrong" color="gray900">
                  {option.vote_count ?? 0}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </Box>

      {!poll.is_anonymous && <WhoHasntVoted nonVoters={nonVoters} />}
    </Box>
  );
}

// ─── Rank voter avatar row (same voters shown for all rank options) ────────────

function RankVoterAvatars({ voters }: { voters: { user_id?: string }[] }) {
  const visible = voters.slice(0, 3);
  const overflow = voters.length - 3;
  if (visible.length === 0) return null;

  return (
    <Box flexDirection="row" alignItems="center">
      {visible.map((v, i) => (
        <Box
          key={v.user_id ?? i}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
        >
          <Avatar seed={v.user_id ?? ""} variant="xs" />
        </Box>
      ))}
      {overflow > 0 && (
        <Box style={[styles.overflowBadge, { marginLeft: -6 }]}>
          <Text variant="bodyXxsMedium" color="gray700">
            +{overflow}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Rank Poll Responses ──────────────────────────────────────────────────────

function RankResponsesContent({
  tripId,
  pollId,
}: {
  tripId: string;
  pollId: string;
}) {
  const { data, isLoading, isError } = useGetRankPollResults(tripId, pollId, {
    query: { enabled: !!(tripId && pollId) },
  });
  const { data: votersData } = useGetRankPollVoters(tripId, pollId, {
    query: { enabled: !!(tripId && pollId) },
  });

  if (isLoading) {
    return (
      <Box alignItems="center" paddingVertical="lg">
        <Spinner />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Text variant="bodySmDefault" color="gray500">
        Couldn't load results.
      </Text>
    );
  }

  const sorted = [...(data.all_options ?? [])].sort(
    (a, b) => (b.borda_score ?? 0) - (a.borda_score ?? 0),
  );
  const closed = isPollClosed(data.deadline);
  const winner = closed && sorted.length > 0 ? sorted[0] : null;
  const totalVoted = data.total_voters ?? 0;
  const totalMembers = data.total_members ?? votersData?.total_members ?? 0;
  const allVoters = votersData?.voters ?? [];
  const nonVoters = allVoters.filter((v) => !v.has_voted);
  const votedVoters = allVoters.filter((v) => v.has_voted);
  const maxBorda = sorted[0]?.borda_score ?? 1;

  // Winner percentage: percentage of voters who ranked it #1
  const winnerPct =
    winner && totalVoted > 0
      ? Math.round(((winner.vote_count ?? 0) / totalVoted) * 100)
      : 0;

  return (
    <Box gap="sm">
      <Text variant="bodyXxsDefault" color="gray500">
        {totalVoted}/{totalMembers} voted
      </Text>

      {/* ── Closed: winner card ── */}
      {winner && (
        <Box alignItems="center" gap="xs" paddingVertical="sm">
          <Box style={styles.winnerPill}>
            <Text variant="bodyXxsStrong" style={{ color: ColorPalette.white }}>
              Winner
            </Text>
          </Box>
          <Box style={styles.winnerCircle}>
            <Award size={24} color={ColorPalette.brand500} />
          </Box>
          <Text
            variant="headingMd"
            color="gray950"
            style={{ textAlign: "center" }}
            numberOfLines={2}
          >
            {winner.name}
          </Text>
          <Text variant="bodyXsDefault" color="gray500">
            {winnerPct}% of votes · {totalVoted} response
            {totalVoted !== 1 ? "s" : ""}
          </Text>
        </Box>
      )}

      {/* ── Option rows ── */}
      <Box>
        {sorted.map((opt, i) => {
          const barPct =
            maxBorda > 0 ? ((opt.borda_score ?? 0) / maxBorda) * 100 : 0;
          const barColor =
            i === 0 ? ColorPalette.brand500 : ColorPalette.gray200;

          if (closed) {
            // Closed: number + name + voters + count + progress bar + divider
            return (
              <Box key={opt.option_id}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="sm"
                  paddingVertical="sm"
                >
                  <Text variant="headingSm" style={styles.rankNumberLarge}>
                    {i + 1}
                  </Text>
                  <Text
                    variant="bodySmMedium"
                    color="gray900"
                    style={{ flex: 1 }}
                    numberOfLines={1}
                  >
                    {opt.name}
                  </Text>
                  <RankVoterAvatars voters={votedVoters} />
                  <Text variant="bodySmStrong" color="gray900">
                    {opt.vote_count ?? 0}
                  </Text>
                </Box>
                <Box style={styles.progressTrack}>
                  <Box
                    style={[
                      styles.progressBar,
                      { width: `${barPct}%` as any, backgroundColor: barColor },
                    ]}
                  />
                </Box>
                {i < sorted.length - 1 && <Box style={styles.rowDivider} />}
              </Box>
            );
          }

          // Open: blue circle + name + voters + avg rank (image 7 style)
          return (
            <Box
              key={opt.option_id}
              flexDirection="row"
              alignItems="center"
              gap="sm"
              backgroundColor="gray100"
              borderRadius="full"
              paddingHorizontal="sm"
              paddingVertical="xs"
              style={{ marginBottom: Layout.spacing.xs }}
            >
              <Box style={styles.rankCircleBlue}>
                <Text
                  variant="bodyXsMedium"
                  style={{ color: ColorPalette.white }}
                >
                  {i + 1}
                </Text>
              </Box>
              <Text
                variant="bodySmMedium"
                color="gray900"
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {opt.name}
              </Text>
              <Box alignItems="flex-end" gap="xxs">
                <RankVoterAvatars voters={votedVoters} />
                <Text variant="bodyXxsDefault" color="gray500">
                  avg rank {(opt.average_rank ?? 0).toFixed(1)}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {nonVoters.length > 0 && <WhoHasntVoted nonVoters={nonVoters} />}
    </Box>
  );
}

// ─── Responses Tab ────────────────────────────────────────────────────────────

function ResponsesTab({
  poll,
  tripId,
  onSelectOption,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onSelectOption: (id: string) => void;
}) {
  if (poll.poll_type === "rank") {
    return <RankResponsesContent tripId={tripId} pollId={poll.id ?? ""} />;
  }
  if (isYesNoPoll(poll)) {
    return <YesNoResponsesContent poll={poll} tripId={tripId} />;
  }
  return (
    <VoteResponsesContent
      poll={poll}
      tripId={tripId}
      onSelectOption={onSelectOption}
    />
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  poll,
  tripId,
  onUpdate,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onUpdate?: () => void;
}) {
  const [isAnonymous, setIsAnonymous] = useState(poll.is_anonymous ?? false);
  const [deadline, setDeadline] = useState<Date | null>(
    poll.deadline ? new Date(poll.deadline) : null,
  );
  const updateVotePoll = useUpdatePoll();
  const updateRankPoll = useUpdateRankPoll();
  const toast = useToast();

  const update = poll.poll_type === "rank" ? updateRankPoll : updateVotePoll;

  const handleAnonymousToggle = async (value: boolean) => {
    setIsAnonymous(value);
    try {
      await update.mutateAsync({
        tripID: tripId,
        pollId: poll.id ?? "",
        data: { is_anonymous: value },
      });
      onUpdate?.();
    } catch {
      setIsAnonymous(!value);
      toast.show({ message: "Failed to update setting." });
    }
  };

  const handleDeadlineChange = async (newDeadline: Date | null) => {
    setDeadline(newDeadline);
    try {
      await update.mutateAsync({
        tripID: tripId,
        pollId: poll.id ?? "",
        data: { deadline: newDeadline?.toISOString() ?? undefined },
      });
      onUpdate?.();
    } catch {
      setDeadline(poll.deadline ? new Date(poll.deadline) : null);
      toast.show({ message: "Failed to update deadline." });
    }
  };

  return (
    <PollSettingsPanel
      deadline={deadline}
      onDeadlineChange={handleDeadlineChange}
      isAnonymous={isAnonymous}
      onAnonymousChange={handleAnonymousToggle}
    />
  );
}

// ─── Vote Option Voters Sub-Sheet ─────────────────────────────────────────────

function VoteOptionVotersSheet({
  tripId,
  pollId,
  optionId,
  optionName,
  onClose,
}: {
  tripId: string;
  pollId: string;
  optionId: string | null;
  optionName: string;
  onClose: () => void;
}) {
  const subSheetRef = useRef<BottomSheetMethods>(null);

  const { data, isLoading } = useGetVoteOptionVoters(
    tripId,
    pollId,
    optionId ?? "",
    { query: { enabled: !!(tripId && pollId && optionId) } },
  );

  useEffect(() => {
    if (optionId) {
      subSheetRef.current?.snapToIndex(0);
    } else {
      subSheetRef.current?.close();
    }
  }, [optionId]);

  const voters = data?.voters ?? [];

  return (
    <BottomSheetComponent ref={subSheetRef} initialIndex={-1} onClose={onClose}>
      <Box paddingHorizontal="md" gap="md">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Text variant="bodySmStrong" color="gray900" style={{ flex: 1 }}>
            {optionName}
            {data
              ? ` · ${data.total_voters} vote${data.total_voters !== 1 ? "s" : ""}`
              : ""}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={24} color={ColorPalette.gray500} />
          </Pressable>
        </Box>

        {isLoading ? (
          <Box alignItems="center" paddingVertical="md">
            <Spinner />
          </Box>
        ) : voters.length === 0 ? (
          <Text variant="bodySmDefault" color="gray500">
            No voters yet.
          </Text>
        ) : (
          <Box gap="sm">
            {voters.map((voter) => (
              <Box
                key={voter.user_id}
                flexDirection="row"
                alignItems="center"
                gap="sm"
              >
                <Avatar seed={voter.user_id ?? ""} variant="md" />
                <Box flex={1}>
                  <Text
                    variant="bodySmMedium"
                    color="gray900"
                    numberOfLines={1}
                  >
                    {voter.name ?? voter.username ?? "Unknown"}
                  </Text>
                  {voter.voted_at && (
                    <Text variant="bodyXxsDefault" color="gray500">
                      {formatVotedAt(voter.voted_at)}
                    </Text>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </BottomSheetComponent>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PollDetailSheet({
  poll,
  tripId,
  visible,
  onClose,
  onRefresh,
}: PollDetailSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("poll");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleClose = () => {
    setActiveTab("poll");
    setSelectedOptionId(null);
    onClose();
  };

  return (
    <>
      <BottomSheetComponent
        ref={sheetRef}
        initialIndex={-1}
        onClose={handleClose}
      >
        {poll && (
          <Box gap="md">
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal="md"
              paddingTop="xxs"
            >
              <TabBar active={activeTab} onChange={setActiveTab} />
              <Pressable onPress={handleClose} hitSlop={8}>
                <X size={24} color={ColorPalette.gray500} />
              </Pressable>
            </Box>

            <Box paddingHorizontal="md">
              {activeTab === "poll" && (
                <PollTab
                  poll={poll}
                  tripId={tripId}
                  onUpdate={onRefresh}
                  onOptionAdded={onRefresh}
                />
              )}
              {activeTab === "responses" && (
                <ResponsesTab
                  poll={poll}
                  tripId={tripId}
                  onSelectOption={setSelectedOptionId}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab poll={poll} tripId={tripId} onUpdate={onRefresh} />
              )}
            </Box>
          </Box>
        )}
      </BottomSheetComponent>

      {poll?.poll_type !== "rank" && (
        <VoteOptionVotersSheet
          tripId={tripId}
          pollId={poll?.id ?? ""}
          optionId={selectedOptionId}
          optionName={
            poll?.options?.find((o) => o.id === selectedOptionId)?.name ?? ""
          }
          onClose={() => setSelectedOptionId(null)}
        />
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const OPTION_BADGE_SIZE = 22;
const WINNER_CIRCLE_SIZE = 56;

const styles = StyleSheet.create({
  sectionLabel: {
    color: ColorPalette.brand500,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  overflowBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ColorPalette.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  nonVotersRow: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  yesCard: {
    backgroundColor: ColorPalette.brand500,
    padding: Layout.spacing.sm,
  },
  noCard: {
    backgroundColor: ColorPalette.gray50,
    padding: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  resultRow: {
    position: "relative",
    backgroundColor: ColorPalette.gray50,
    borderRadius: CornerRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  resultRowWinner: {
    borderWidth: 1.5,
    borderColor: ColorPalette.brand500,
  },
  resultBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: ColorPalette.brand50,
  },
  resultRowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    gap: Layout.spacing.xs,
  },
  winnerBadge: {
    backgroundColor: ColorPalette.brand500,
    borderRadius: CornerRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  winnerBadgeText: {
    color: ColorPalette.white,
  },
  winnerCircle: {
    width: WINNER_CIRCLE_SIZE,
    height: WINNER_CIRCLE_SIZE,
    borderRadius: WINNER_CIRCLE_SIZE / 2,
    backgroundColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
  },
  rankWinnerRow: {
    backgroundColor: ColorPalette.brand50,
    borderWidth: 1.5,
    borderColor: ColorPalette.brand500,
  },
  rankBadge: {
    width: OPTION_BADGE_SIZE,
    height: OPTION_BADGE_SIZE,
    borderRadius: OPTION_BADGE_SIZE / 2,
    backgroundColor: ColorPalette.gray700,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeWinner: {
    backgroundColor: ColorPalette.brand500,
  },
  votePill: {
    backgroundColor: ColorPalette.gray100,
    borderRadius: 999,
  },
  votePillLeader: {
    backgroundColor: ColorPalette.brand100,
  },
  winnerPill: {
    backgroundColor: ColorPalette.brand500,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankCircleBlue: {
    width: OPTION_BADGE_SIZE,
    height: OPTION_BADGE_SIZE,
    borderRadius: OPTION_BADGE_SIZE / 2,
    backgroundColor: ColorPalette.blue500,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    backgroundColor: ColorPalette.gray100,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: ColorPalette.gray100,
    marginVertical: Layout.spacing.xs,
  },
  rankNumberLarge: {
    color: ColorPalette.gray400,
    width: 20,
    textAlign: "center",
  },
});
