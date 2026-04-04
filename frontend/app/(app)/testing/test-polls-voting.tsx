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
import { Box, Button, Screen, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";

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

// ─── Poll creation configs ────────────────────────────────────────────────────

const VOTE_POLL_CONFIGS = [
  {
    key: "single" as const,
    label: "Single Choice",
    body: {
      question: "Which destination should we visit?",
      poll_type: "single",
      options: [
        { option_type: "custom", name: "Paris" },
        { option_type: "custom", name: "Tokyo" },
        { option_type: "custom", name: "New York" },
        { option_type: "custom", name: "Sydney" },
      ],
      is_anonymous: true,
      should_notify_members: true,
    },
  },
  {
    key: "multi" as const,
    label: "Multiple Choice",
    body: {
      question: "Which activities do you want to do?",
      poll_type: "multi",
      options: [
        { option_type: "custom", name: "Snorkeling" },
        { option_type: "custom", name: "Diving" },
        { option_type: "custom", name: "Hiking" },
        { option_type: "custom", name: "Kayaking" },
        { option_type: "custom", name: "Fishing" },
      ],
      is_anonymous: false,
      should_notify_members: false,
    },
  },
  {
    key: "yesno" as const,
    label: "Yes / No",
    body: {
      question: "Should we book the hotels now?",
      poll_type: "single",
      options: [
        { option_type: "custom", name: "Yes" },
        { option_type: "custom", name: "No" },
      ],
      is_anonymous: false,
      should_notify_members: false,
    },
  },
] as const;

const RANK_POLL_BODY = {
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

// ─── API helper ──────────────────────────────────────────────────────────────

async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<{ ok: boolean; data: any; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, data, status: res.status };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type PollSetup = {
  tripId: string;
  singlePollId: string;
  multiPollId: string;
  yesnoPollId: string;
  rankPollId: string;
};

// ─── Rank poll wrapper — fetches its own results ──────────────────────────────

function RankPollFetcher({
  tripId,
  pollId,
  onRanked,
}: {
  tripId: string;
  pollId: string;
  onRanked: () => void;
}) {
  const { data, isLoading } = useGetRankPollResults(tripId, pollId, {
    query: { enabled: !!(tripId && pollId) },
  });

  if (isLoading) {
    return (
      <Box
        backgroundColor="white"
        borderRadius="md"
        alignItems="center"
        padding="lg"
        style={styles.card}
      >
        <ActivityIndicator color={ColorPalette.brand500} />
      </Box>
    );
  }
  if (!data) return null;
  return <RankPollCard poll={data} tripId={tripId} onRanked={onRanked} />;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TestPollsVotingScreen() {
  const queryClient = useQueryClient();

  const [setup, setSetup] = useState<PollSetup | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [manualIds, setManualIds] = useState({
    tripId: "",
    single: "",
    multi: "",
    yesno: "",
    rank: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const tripId = setup?.tripId ?? manualIds.tripId;
  const singlePollId = setup?.singlePollId ?? manualIds.single;
  const multiPollId = setup?.multiPollId ?? manualIds.multi;
  const yesnoPollId = setup?.yesnoPollId ?? manualIds.yesno;
  const rankPollId = setup?.rankPollId ?? manualIds.rank;
  const isReady = !!(
    tripId &&
    singlePollId &&
    multiPollId &&
    yesnoPollId &&
    rankPollId
  );

  // ─── Data ──────────────────────────────────────────────────────────────────

  const { data: pollsData, refetch: refetchPolls } = useGetPollsByTripID(
    tripId,
    {},
    { query: { enabled: !!tripId } },
  );

  const singlePoll = useMemo(
    () => pollsData?.items?.find((p) => p.id === singlePollId),
    [pollsData, singlePollId],
  );
  const multiPoll = useMemo(
    () => pollsData?.items?.find((p) => p.id === multiPollId),
    [pollsData, multiPollId],
  );
  const yesnoPoll = useMemo(
    () => pollsData?.items?.find((p) => p.id === yesnoPollId),
    [pollsData, yesnoPollId],
  );

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tripId) return;

    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", trip_id: tripId }));
      console.log("[test-polls] subscribed to", tripId);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "events") return;
        for (const evt of msg.events ?? []) {
          console.log("[test-polls] event:", evt.topic, evt.data);
          if (
            evt.topic === "poll.vote_added" ||
            evt.topic === "poll.vote_removed"
          ) {
            queryClient.invalidateQueries({
              queryKey: getPollsByTripIDQueryKey(tripId),
            });
          }
          if (evt.topic === "poll.ranking_submitted") {
            queryClient.invalidateQueries({
              queryKey: getRankPollResultsQueryKey(tripId, rankPollId),
            });
          }
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = (e) => console.warn("[test-polls] ws error", e);
    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [tripId, rankPollId, queryClient]);

  // ─── Setup ─────────────────────────────────────────────────────────────────

  const runSetup = async () => {
    setIsSettingUp(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("[test-polls] not authenticated");
        return;
      }

      const tripRes = await apiRequest(
        "POST",
        "/api/v1/trips",
        { name: "Poll Voting Test", budget_min: 100, budget_max: 10000 },
        token,
      );
      if (!tripRes.ok) {
        console.error("[test-polls] trip failed", tripRes.data);
        return;
      }
      const newTripId: string = tripRes.data.id;
      console.log("[test-polls] trip:", newTripId);

      const ids: Record<string, string> = {};
      for (const cfg of VOTE_POLL_CONFIGS) {
        const res = await apiRequest(
          "POST",
          `/api/v1/trips/${newTripId}/vote-polls`,
          cfg.body,
          token,
        );
        if (!res.ok) {
          console.error("[test-polls]", cfg.label, "failed", res.data);
          return;
        }
        ids[cfg.key] = res.data.id;
        console.log("[test-polls]", cfg.label, "poll:", ids[cfg.key]);
      }

      const rankRes = await apiRequest(
        "POST",
        `/api/v1/trips/${newTripId}/rank-polls`,
        RANK_POLL_BODY,
        token,
      );
      if (!rankRes.ok) {
        console.error("[test-polls] rank poll failed", rankRes.data);
        return;
      }
      const rankId: string = rankRes.data.id;
      console.log("[test-polls] rank poll:", rankId);

      if (!ids.single || !ids.multi || !ids.yesno) {
        console.error("[test-polls] missing poll IDs");
        return;
      }

      setSetup({
        tripId: newTripId,
        singlePollId: ids.single,
        multiPollId: ids.multi,
        yesnoPollId: ids.yesno,
        rankPollId: rankId,
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchPolls();
    setRefreshing(false);
  }, [refetchPolls]);

  const handleVoted = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getPollsByTripIDQueryKey(tripId),
    });
  }, [queryClient, tripId]);

  const handleRanked = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getRankPollResultsQueryKey(tripId, rankPollId),
    });
  }, [queryClient, tripId, rankPollId]);

  // ─── Render ────────────────────────────────────────────────────────────────

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
          Poll Voting Test
        </Text>

        {/* ── Setup ──────────────────────────────────────────────────── */}
        {!isReady && (
          <Box
            backgroundColor="white"
            borderRadius="md"
            style={styles.card}
            gap="sm"
          >
            <Text variant="headingSm" color="gray900">
              Setup
            </Text>
            <Text variant="bodySmDefault" color="gray600">
              Create a trip with all 4 poll types, or paste existing IDs.
            </Text>
            <Button
              layout="textOnly"
              label="Create Trip + 4 Polls"
              variant="Primary"
              onPress={runSetup}
              loading={isSettingUp}
              disabled={isSettingUp}
            />
            <Box style={styles.divider} />
            {(
              [
                { key: "tripId", placeholder: "Trip ID" },
                { key: "single", placeholder: "Single choice poll ID" },
                { key: "multi", placeholder: "Multi choice poll ID" },
                { key: "yesno", placeholder: "Yes/No poll ID" },
                { key: "rank", placeholder: "Ranking poll ID" },
              ] as const
            ).map(({ key, placeholder }) => (
              <TextInput
                key={key}
                style={styles.input}
                placeholder={placeholder}
                value={manualIds[key]}
                onChangeText={(v) =>
                  setManualIds((prev) => ({ ...prev, [key]: v }))
                }
                autoCapitalize="none"
                placeholderTextColor={ColorPalette.gray400}
              />
            ))}
          </Box>
        )}

        {/* ── Poll cards ─────────────────────────────────────────────── */}
        {isReady && (
          <>
            {setup && (
              <Box borderRadius="sm" style={styles.infoBox}>
                <Text variant="bodyXsDefault" color="gray700" selectable>
                  Trip: {tripId}
                </Text>
              </Box>
            )}

            <Text variant="headingSm" color="gray800">
              Single Choice
            </Text>
            {singlePoll ? (
              <VotePollCard
                poll={singlePoll}
                tripId={tripId}
                onVoted={handleVoted}
              />
            ) : (
              <Box
                backgroundColor="white"
                borderRadius="md"
                alignItems="center"
                padding="lg"
                style={styles.card}
              >
                <ActivityIndicator color={ColorPalette.brand500} />
              </Box>
            )}

            <Text variant="headingSm" color="gray800">
              Multiple Choice
            </Text>
            {multiPoll ? (
              <VotePollCard
                poll={multiPoll}
                tripId={tripId}
                onVoted={handleVoted}
              />
            ) : (
              <Box
                backgroundColor="white"
                borderRadius="md"
                alignItems="center"
                padding="lg"
                style={styles.card}
              >
                <ActivityIndicator color={ColorPalette.brand500} />
              </Box>
            )}

            <Text variant="headingSm" color="gray800">
              Yes / No
            </Text>
            {yesnoPoll ? (
              <VotePollCard
                poll={yesnoPoll}
                tripId={tripId}
                onVoted={handleVoted}
              />
            ) : (
              <Box
                backgroundColor="white"
                borderRadius="md"
                alignItems="center"
                padding="lg"
                style={styles.card}
              >
                <ActivityIndicator color={ColorPalette.brand500} />
              </Box>
            )}

            <Text variant="headingSm" color="gray800">
              Ranking
            </Text>
            <RankPollFetcher
              tripId={tripId}
              pollId={rankPollId}
              onRanked={handleRanked}
            />
          </>
        )}
      </ScrollView>
    </Screen>
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
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
  divider: {
    height: 1,
    backgroundColor: ColorPalette.gray100,
  },
  input: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: ColorPalette.gray25,
    color: ColorPalette.gray900,
  },
  infoBox: {
    padding: 10,
    backgroundColor: ColorPalette.blue25,
    borderWidth: 1,
    borderColor: ColorPalette.blue100,
  },
});
