import { getAuthToken } from "@/api/client";
import {
  getPollsByTripIDQueryKey,
  useGetPollsByTripID,
} from "@/api/polls/useGetPollsByTripID";
import {
  getRankPollResultsQueryKey,
  useGetRankPollResults,
} from "@/api/polls/useGetRankPollResults";
import RankPollCard from "@/app/(app)/trips/[id]/polls/components/rank-poll-card";
import VotePollCard from "@/app/(app)/trips/[id]/polls/components/vote-poll-card";
import {
  Box,
  Button,
  Divider,
  ErrorState,
  Screen,
  Text,
  useToast,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import {
  ModelsPollAPIResponse,
  ModelsRankPollResultsResponse,
} from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import Animated, { Easing, LinearTransition } from "react-native-reanimated";

// ─── Config ──────────────────────────────────────────────────────────────────

const resolveHost = (): string => {
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoConfig?.hostUri ??
    constants.expoGoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) return debuggerHost.split(":")[0];
  if (Platform.OS === "web" && typeof window !== "undefined")
    return window.location.hostname;
  return "localhost";
};

const HOST = resolveHost();
const BASE_URL = `http://${HOST}:8000`;
const WS_URL = `ws://${HOST}:8000/ws`;

// ─── Dummy poll definitions ───────────────────────────────────────────────────

const DUMMY_POLLS = [
  {
    question: "Which destination should we visit?",
    poll_type: "single",
    options: [
      { option_type: "custom", name: "Paris" },
      { option_type: "custom", name: "Tokyo" },
      { option_type: "custom", name: "New York" },
      { option_type: "custom", name: "Sydney" },
    ],
    is_anonymous: false,
    should_notify_members: false,
  },
  {
    question: "Which activities do you want to do?",
    poll_type: "multi",
    options: [
      { option_type: "custom", name: "Snorkeling" },
      { option_type: "custom", name: "Hiking" },
      { option_type: "custom", name: "Kayaking" },
      { option_type: "custom", name: "Diving" },
    ],
    is_anonymous: false,
    should_notify_members: false,
  },
  {
    question: "Should we book the hotels now?",
    poll_type: "single",
    options: [
      { option_type: "custom", name: "Yes" },
      { option_type: "custom", name: "No" },
    ],
    is_anonymous: false,
    should_notify_members: false,
  },
] as const;

const DUMMY_RANK_POLL = {
  question: "Rank your preferred accommodation types",
  poll_type: "rank",
  options: [
    { option_type: "custom", name: "Hotel" },
    { option_type: "custom", name: "Airbnb" },
    { option_type: "custom", name: "Hostel" },
    { option_type: "custom", name: "Resort" },
  ],
  is_anonymous: false,
  should_notify_members: false,
} as const;

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiPost(path: string, body: unknown, token: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, data: text };
  }
}

// ─── Results panel ────────────────────────────────────────────────────────────

function VotePollResults({ poll }: { poll: ModelsPollAPIResponse }) {
  const total = poll.options?.reduce((s, o) => s + (o.vote_count ?? 0), 0) ?? 0;
  return (
    <Box gap="xxs">
      <Text variant="bodySmStrong" color="gray900" numberOfLines={2}>
        {poll.question}
      </Text>
      {poll.options?.map((opt) => {
        const pct =
          total > 0 ? Math.round(((opt.vote_count ?? 0) / total) * 100) : 0;
        return (
          <Box key={opt.id} style={styles.resultRow}>
            <Box style={[styles.resultBar, { width: `${pct}%` as any }]} />
            <Box style={styles.resultRowInner}>
              <Text
                variant="bodyXsDefault"
                color="gray700"
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {opt.name}
              </Text>
              <Text variant="bodyXsStrong" color="gray900">
                {opt.vote_count ?? 0}
              </Text>
            </Box>
          </Box>
        );
      })}
      <Text variant="bodyXxsDefault" color="gray500">
        {total} vote{total !== 1 ? "s" : ""}
      </Text>
    </Box>
  );
}

function RankPollResults({ data }: { data: ModelsRankPollResultsResponse }) {
  // Sort by borda_score descending so higher scores rank first
  const sorted = [...(data.all_options ?? [])].sort(
    (a, b) => (b.borda_score ?? 0) - (a.borda_score ?? 0),
  );
  return (
    <Box gap="xxs">
      <Text variant="bodySmStrong" color="gray900" numberOfLines={2}>
        {data.question}
      </Text>
      {sorted.map((opt, i) => (
        <Animated.View
          key={opt.option_id}
          layout={LinearTransition.duration(320).easing(
            Easing.inOut(Easing.quad),
          )}
        >
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Box style={styles.rankBadgeSmall}>
              <Text
                variant="bodyXxsStrong"
                style={{ color: ColorPalette.white }}
              >
                {i + 1}
              </Text>
            </Box>
            <Text
              variant="bodyXsDefault"
              color="gray700"
              style={{ flex: 1 }}
              numberOfLines={1}
            >
              {opt.name}
            </Text>
            <Text variant="bodyXxsDefault" color="gray500">
              {opt.borda_score ?? 0}pts
            </Text>
          </Box>
        </Animated.View>
      ))}
      <Text variant="bodyXxsDefault" color="gray500">
        {data.total_voters ?? 0} voter{data.total_voters !== 1 ? "s" : ""}
      </Text>
    </Box>
  );
}

// ─── Rank poll row — fetches its own results ──────────────────────────────────

function RankPollRow({
  poll,
  tripId,
  onRanked,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  onRanked: () => void;
}) {
  const { data, isLoading } = useGetRankPollResults(tripId, poll.id ?? "", {
    query: { enabled: !!(tripId && poll.id) },
  });

  if (isLoading) {
    return (
      <Box
        backgroundColor="white"
        borderRadius="md"
        alignItems="center"
        padding="lg"
        style={styles.loadingCard}
      >
        <ActivityIndicator color={ColorPalette.brand500} />
      </Box>
    );
  }
  if (!data) return null;
  return <RankPollCard poll={data} tripId={tripId} onRanked={onRanked} />;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PollsScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingDummy, setIsCreatingDummy] = useState(false);

  const toast = useToast();

  const {
    data: pollsData,
    isLoading,
    isError,
    refetch: refetchPolls,
  } = useGetPollsByTripID(tripId ?? "", {}, { query: { enabled: !!tripId } });

  const polls = pollsData?.items ?? [];
  const rankPolls = polls.filter((p) => p.poll_type === "rank");
  const votePolls = polls.filter((p) => p.poll_type !== "rank");

  // Keep a stable ref so the WS handler always calls the latest refetch
  // without the effect needing to reconnect when refetch changes reference.
  const refetchPollsRef = useRef(refetchPolls);
  refetchPollsRef.current = refetchPolls;

  // ─── WebSocket ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tripId) return;
    const ws = new WebSocket(WS_URL);
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "subscribe", trip_id: tripId }));
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "events") return;
        for (const evt of msg.events ?? []) {
          console.log("[polls] ws:", evt.topic);
          if (
            [
              "poll.vote_added",
              "poll.vote_removed",
              "poll.created",
              "poll.deleted",
              "poll.updated",
            ].includes(evt.topic)
          ) {
            refetchPollsRef.current();
          }
          if (evt.topic === "poll.ranking_submitted") {
            // Force immediate refetch of all rank poll result queries for this trip
            queryClient.refetchQueries({
              predicate: (query) => {
                const key = query.queryKey[0] as any;
                return (
                  key?.url === "/api/v1/trips/:tripID/rank-polls/:pollId" &&
                  key?.params?.tripID === tripId
                );
              },
            });
          }
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = (e) => console.warn("[polls] ws error", e);
    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [tripId, queryClient]); // WS only reconnects when tripId changes

  // ─── Create dummy polls ─────────────────────────────────────────────────

  const createDummyPolls = useCallback(async () => {
    if (!tripId) return;
    setIsCreatingDummy(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("[polls] not authenticated");
        return;
      }

      for (const body of DUMMY_POLLS) {
        const res = await apiPost(
          `/api/v1/trips/${tripId}/vote-polls`,
          body,
          token,
        );
        if (!res.ok) console.error("[polls] vote poll failed", res.data);
        else
          console.log("[polls] created", body.poll_type, "poll:", res.data.id);
      }

      const rankRes = await apiPost(
        `/api/v1/trips/${tripId}/rank-polls`,
        DUMMY_RANK_POLL,
        token,
      );
      if (!rankRes.ok) console.error("[polls] rank poll failed", rankRes.data);
      else console.log("[polls] created rank poll:", rankRes.data.id);

      queryClient.invalidateQueries({
        queryKey: getPollsByTripIDQueryKey(tripId),
      });
      toast.show({ message: "Polls created! Your trip members can now vote." });
    } finally {
      setIsCreatingDummy(false);
    }
  }, [tripId, queryClient, toast]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchPollsRef.current();
    setRefreshing(false);
  }, []);

  const handleVoted = useCallback(() => {
    refetchPollsRef.current();
  }, []);

  const handleRanked = useCallback(
    (pollId: string) => {
      queryClient.refetchQueries({
        queryKey: getRankPollResultsQueryKey(tripId ?? "", pollId),
      });
    },
    [queryClient, tripId],
  );

  // ─── Loading / error ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Screen>
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator color={ColorPalette.brand500} />
        </Box>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <Box flex={1} alignItems="center" justifyContent="center" padding="md">
          <ErrorState title="Couldn't load polls" />
        </Box>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text variant="headingMd" color="gray950">
          Polls
        </Text>

        {/* Create dummy polls */}
        <Button
          layout="textOnly"
          label="Create Dummy Polls"
          variant="Secondary"
          onPress={createDummyPolls}
          loading={isCreatingDummy}
          disabled={isCreatingDummy}
        />

        {/* Poll cards */}
        {polls.length === 0 && !isCreatingDummy && (
          <Box alignItems="center" paddingVertical="xl">
            <Text variant="bodySmDefault" color="gray500">
              No polls yet. Tap above to create some.
            </Text>
          </Box>
        )}

        {votePolls.map((poll) => (
          <VotePollCard
            key={poll.id}
            poll={poll}
            tripId={tripId ?? ""}
            onVoted={handleVoted}
          />
        ))}

        {rankPolls.map((poll) => (
          <RankPollRow
            key={poll.id}
            poll={poll}
            tripId={tripId ?? ""}
            onRanked={() => handleRanked(poll.id ?? "")}
          />
        ))}

        {/* Results */}
        {polls.length > 0 && (
          <>
            <Divider />
            <Text variant="headingSm" color="gray800">
              Results
            </Text>
            <Box
              backgroundColor="white"
              borderRadius="md"
              style={styles.resultsCard}
            >
              {votePolls.map((poll, i) => (
                <React.Fragment key={poll.id}>
                  {i > 0 && <Divider />}
                  <VotePollResults poll={poll} />
                </React.Fragment>
              ))}
              {rankPolls.map((poll, i) => (
                <RankPollResultsRow
                  key={poll.id}
                  poll={poll}
                  tripId={tripId ?? ""}
                  showDivider={votePolls.length > 0 || i > 0}
                />
              ))}
            </Box>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Rank results row (fetches its own data) ──────────────────────────────────

function RankPollResultsRow({
  poll,
  tripId,
  showDivider,
}: {
  poll: ModelsPollAPIResponse;
  tripId: string;
  showDivider: boolean;
}) {
  const { data } = useGetRankPollResults(tripId, poll.id ?? "", {
    query: { enabled: !!(tripId && poll.id) },
  });
  if (!data) return null;
  return (
    <>
      {showDivider && <Divider />}
      <RankPollResults data={data} />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: ColorPalette.gray25,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 48,
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  resultsCard: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  resultRow: {
    position: "relative",
    backgroundColor: ColorPalette.gray50,
    borderRadius: 4,
    overflow: "hidden",
  },
  resultBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: ColorPalette.blue50,
  },
  resultRowInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rankBadgeSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ColorPalette.gray700,
    alignItems: "center",
    justifyContent: "center",
  },
});
