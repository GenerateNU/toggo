import { getAuthToken } from "@/api/client";
import Constants from "expo-constants";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const getToken = async () => {
  const token = await getAuthToken();
  return token ?? null;
};

const resolveHost = (): string => {
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoConfig?.hostUri ??
    constants.expoGoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) return debuggerHost.split(":")[0];
  if (typeof window !== "undefined") return window.location.hostname;
  return "localhost";
};

const HOST = resolveHost();
const BASE = `http://${HOST}:8000/api/v1`;

interface TestResult {
  status: number;
  ok: boolean;
  data: any;
  duration: number;
}

async function api(
  method: string,
  path: string,
  body?: any,
): Promise<TestResult> {
  const token = await getToken();
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const duration = Date.now() - start;
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text || "(empty)";
  }
  return { status: res.status, ok: res.ok, data, duration };
}

let tripId = "";
let pollId = "";
let optionIds: string[] = [];

async function ensureUser(): Promise<TestResult> {
  const check = await api("GET", "/users/me");
  if (check.ok) return check;
  return api("POST", "/users", {
    name: "Test User",
    username: "testuser_rank",
    phone_number: "+12025551234",
  });
}

async function setupTrip(): Promise<TestResult> {
  const res = await api("POST", "/trips", {
    name: "Rank Poll Test Trip",
    budget_min: 100,
    budget_max: 5000,
  });
  if (res.ok) tripId = res.data.id;
  return res;
}

function ResultBox({ result }: { result: TestResult | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;
  const bg = result.ok ? "#e6f9e6" : "#fce4e4";
  const border = result.ok ? "#4caf50" : "#f44336";
  const raw =
    typeof result.data === "string"
      ? result.data
      : JSON.stringify(result.data, null, 2);
  const isLong = raw.length > 300;
  return (
    <View style={[rs.box, { backgroundColor: bg, borderColor: border }]}>
      <View style={rs.header}>
        <Text style={[rs.badge, { backgroundColor: border }]}>
          {result.status}
        </Text>
        <Text style={rs.dur}>{result.duration}ms</Text>
        {isLong && (
          <TouchableOpacity
            onPress={() => setExpanded((e) => !e)}
            style={rs.toggle}
          >
            <Text style={rs.toggleTxt}>
              {expanded ? "▲ Collapse" : "▼ Expand"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        style={expanded ? rs.bodyExpanded : rs.bodyCollapsed}
        nestedScrollEnabled
      >
        <Text style={rs.body} selectable>
          {raw}
        </Text>
      </ScrollView>
    </View>
  );
}

const rs = StyleSheet.create({
  box: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  badge: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  dur: { marginLeft: 8, fontSize: 12, color: "#666" },
  toggle: { marginLeft: "auto" },
  toggleTxt: { fontSize: 12, color: "#555", fontWeight: "600" },
  bodyCollapsed: { maxHeight: 150 },
  bodyExpanded: { maxHeight: 500 },
  body: { fontFamily: "monospace", fontSize: 11, color: "#333" },
});

function TestButton({
  label,
  onRun,
}: {
  label: string;
  onRun: () => Promise<TestResult>;
}) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await onRun();
      setResult(r);
    } catch (e: any) {
      setResult({
        status: 0,
        ok: false,
        data: `Error: ${e.message}`,
        duration: 0,
      });
    } finally {
      setRunning(false);
    }
  }, [onRun]);

  return (
    <View style={tb.wrap}>
      <TouchableOpacity style={tb.btn} onPress={run} disabled={running}>
        {running ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={tb.txt}>{label}</Text>
        )}
      </TouchableOpacity>
      <ResultBox result={result} />
    </View>
  );
}

const tb = StyleSheet.create({
  wrap: { marginBottom: 12 },
  btn: {
    backgroundColor: "#7c4dff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  txt: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sec.card}>
      <Text style={sec.title}>{title}</Text>
      <Text style={sec.desc}>{description}</Text>
      <View style={sec.body}>{children}</View>
    </View>
  );
}

const sec = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 4 },
  desc: { fontSize: 13, color: "#888", marginBottom: 12 },
  body: {},
});

export default function TestRankPollScreen() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.container}>
      <Text style={s.heading}>Rank Poll API Test Suite</Text>
      <Text style={s.subheading}>
        Test ranking polls with Borda count scoring. Each button tests a
        specific endpoint.
      </Text>

      {/* ── 0  SETUP ────────────────────────────────────────────────── */}
      <Section
        title="0 · Setup"
        description="Ensure user exists and create a trip for all tests."
      >
        <TestButton label="Ensure User" onRun={async () => ensureUser()} />
        <TestButton label="Create Trip" onRun={async () => setupTrip()} />
      </Section>

      {/* ── 1  CREATE RANK POLL ─────────────────────────────────────── */}
      <Section
        title="1 · Create Rank Poll"
        description="POST /trips/:tripID/rank-polls — creates ranking poll with options."
      >
        <TestButton
          label="Create rank poll (4 destinations)"
          onRun={async () => {
            const res = await api("POST", `/trips/${tripId}/rank-polls`, {
              question: "Where should we travel?",
              poll_type: "rank",
              options: [
                { name: "🇫🇷 Paris", option_type: "custom" },
                { name: "🇯🇵 Tokyo", option_type: "custom" },
                { name: "🇬🇧 London", option_type: "custom" },
                { name: "🇦🇺 Sydney", option_type: "custom" },
              ],
            });
            if (res.ok) {
              pollId = res.data.id;
              optionIds = (res.data.options || []).map((o: any) => o.id);
            }
            return res;
          }}
        />
        <TestButton
          label="❌ Wrong poll_type 'single' (expect 400)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls`, {
              question: "Bad type",
              poll_type: "single",
              options: [
                { name: "A", option_type: "custom" },
                { name: "B", option_type: "custom" },
              ],
            })
          }
        />
        <TestButton
          label="❌ Only 1 option (expect 400)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls`, {
              question: "Bad poll",
              poll_type: "rank",
              options: [{ name: "Lonely", option_type: "custom" }],
            })
          }
        />
        <TestButton
          label="❌ 16 options (expect 400)"
          onRun={() => {
            const opts = Array.from({ length: 16 }, (_, i) => ({
              name: `Opt${i + 1}`,
              option_type: "custom",
            }));
            return api("POST", `/trips/${tripId}/rank-polls`, {
              question: "Too many",
              poll_type: "rank",
              options: opts,
            });
          }}
        />
      </Section>

      {/* ── 2  GET RESULTS ──────────────────────────────────────────── */}
      <Section
        title="2 · Get Results"
        description="GET /trips/:tripID/rank-polls/:pollId — Borda scores + top 3 + user ranking."
      >
        <TestButton
          label="Get results (before any rankings)"
          onRun={() => api("GET", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
      </Section>

      {/* ── 3  ADD/DELETE OPTIONS ───────────────────────────────────── */}
      <Section
        title="3 · Manage Options"
        description="Add/delete options (only before rankings exist)."
      >
        <TestButton
          label="Add option 'Berlin'"
          onRun={async () => {
            const res = await api(
              "POST",
              `/trips/${tripId}/rank-polls/${pollId}/options`,
              { name: "🇩🇪 Berlin", option_type: "custom" },
            );
            if (res.ok) optionIds.push(res.data.id);
            return res;
          }}
        />
        <TestButton
          label="Verify Berlin added (GET results)"
          onRun={() => api("GET", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
      </Section>

      {/* ── 4  SUBMIT RANKINGS ──────────────────────────────────────── */}
      <Section
        title="4 · Submit Rankings"
        description="POST /rank-polls/:pollId/rank — rank all options with explicit positions."
      >
        <TestButton
          label="Submit ranking: Paris(1), Tokyo(2), Berlin(3), London(4), Sydney(5)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/rank`, {
              rankings: [
                { option_id: optionIds[0], rank: 1 }, // Paris
                { option_id: optionIds[1], rank: 2 }, // Tokyo
                { option_id: optionIds[4], rank: 3 }, // Berlin
                { option_id: optionIds[2], rank: 4 }, // London
                { option_id: optionIds[3], rank: 5 }, // Sydney
              ],
            })
          }
        />
        <TestButton
          label="Get results (should show your ranking + Borda scores)"
          onRun={() => api("GET", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
        <TestButton
          label="Change ranking: Sydney(1), Paris(2), Tokyo(3), London(4), Berlin(5)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/rank`, {
              rankings: [
                { option_id: optionIds[3], rank: 1 }, // Sydney
                { option_id: optionIds[0], rank: 2 }, // Paris
                { option_id: optionIds[1], rank: 3 }, // Tokyo
                { option_id: optionIds[2], rank: 4 }, // London
                { option_id: optionIds[4], rank: 5 }, // Berlin
              ],
            })
          }
        />
        <TestButton
          label="Verify changed ranking"
          onRun={() => api("GET", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
        <TestButton
          label="❌ Rank only 3 options (expect 400 - must rank all)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/rank`, {
              rankings: [
                { option_id: optionIds[0], rank: 1 },
                { option_id: optionIds[1], rank: 2 },
                { option_id: optionIds[2], rank: 3 },
              ],
            })
          }
        />
        <TestButton
          label="❌ Duplicate option (expect 400)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/rank`, {
              rankings: [
                { option_id: optionIds[0], rank: 1 },
                { option_id: optionIds[0], rank: 2 }, // Duplicate!
                { option_id: optionIds[1], rank: 3 },
                { option_id: optionIds[2], rank: 4 },
                { option_id: optionIds[3], rank: 5 },
              ],
            })
          }
        />
        <TestButton
          label="❌ Duplicate rank (expect 400)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/rank`, {
              rankings: [
                { option_id: optionIds[0], rank: 1 },
                { option_id: optionIds[1], rank: 1 }, // Same rank!
                { option_id: optionIds[2], rank: 2 },
                { option_id: optionIds[3], rank: 3 },
                { option_id: optionIds[4], rank: 4 },
              ],
            })
          }
        />
        <TestButton
          label="❌ Gap in ranks (1,2,4,5,6) (expect 400)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/rank`, {
              rankings: [
                { option_id: optionIds[0], rank: 1 },
                { option_id: optionIds[1], rank: 2 },
                { option_id: optionIds[2], rank: 4 }, // Skip 3!
                { option_id: optionIds[3], rank: 5 },
                { option_id: optionIds[4], rank: 6 },
              ],
            })
          }
        />
      </Section>

      {/* ── 5  GET VOTERS ───────────────────────────────────────────── */}
      <Section
        title="5 · Voter Status"
        description="GET /rank-polls/:pollId/voters — who voted vs who didn't."
      >
        <TestButton
          label="Get voter status"
          onRun={() =>
            api("GET", `/trips/${tripId}/rank-polls/${pollId}/voters`)
          }
        />
      </Section>

      {/* ── 6  CANNOT MODIFY AFTER RANKINGS ─────────────────────────── */}
      <Section
        title="6 · Option Immutability"
        description="Once rankings exist, options cannot be added/deleted."
      >
        <TestButton
          label="❌ Add option after rankings (expect 400)"
          onRun={() =>
            api("POST", `/trips/${tripId}/rank-polls/${pollId}/options`, {
              name: "Too Late City",
              option_type: "custom",
            })
          }
        />
        <TestButton
          label="❌ Delete option after rankings (expect 400)"
          onRun={() =>
            api(
              "DELETE",
              `/trips/${tripId}/rank-polls/${pollId}/options/${optionIds[4]}`,
            )
          }
        />
      </Section>

      {/* ── 7  UPDATE POLL ──────────────────────────────────────────── */}
      <Section
        title="7 · Update Poll"
        description="PATCH /rank-polls/:pollId — update question/deadline."
      >
        <TestButton
          label="Update question"
          onRun={() =>
            api("PATCH", `/trips/${tripId}/rank-polls/${pollId}`, {
              question: "Where should we REALLY travel?",
            })
          }
        />
        <TestButton
          label="Set future deadline"
          onRun={() => {
            const future = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString();
            return api("PATCH", `/trips/${tripId}/rank-polls/${pollId}`, {
              deadline: future,
            });
          }}
        />
        <TestButton
          label="Verify update"
          onRun={() => api("GET", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
      </Section>

      {/* ── 8  BORDA COUNT DEMO ─────────────────────────────────────── */}
      <Section
        title="8 · Borda Count Demo"
        description="Simulate multiple voters to see Borda scores in action."
      >
        <TestButton
          label="📊 Run Borda Count Demo"
          onRun={async () => {
            // Create fresh poll
            const poll = await api("POST", `/trips/${tripId}/rank-polls`, {
              question: "🏆 Best City for Food?",
              poll_type: "rank",
              options: [
                { name: "Tokyo", option_type: "custom" },
                { name: "Paris", option_type: "custom" },
                { name: "Rome", option_type: "custom" },
              ],
            });
            if (!poll.ok) return poll;

            const demoId = poll.data.id;
            const opts = (poll.data.options || []).map((o: any) => o.id);

            // Simulate 3 voters with different preferences
            // Voter 1: Tokyo(1), Paris(2), Rome(3) → Tokyo=3pts, Paris=2pts, Rome=1pt
            await api("POST", `/trips/${tripId}/rank-polls/${demoId}/rank`, {
              rankings: [
                { option_id: opts[0], rank: 1 },
                { option_id: opts[1], rank: 2 },
                { option_id: opts[2], rank: 3 },
              ],
            });

            // Voter 2: Paris(1), Tokyo(2), Rome(3) → Paris=3pts, Tokyo=2pts, Rome=1pt
            await api("POST", `/trips/${tripId}/rank-polls/${demoId}/rank`, {
              rankings: [
                { option_id: opts[1], rank: 1 },
                { option_id: opts[0], rank: 2 },
                { option_id: opts[2], rank: 3 },
              ],
            });

            // Voter 3: Tokyo(1), Rome(2), Paris(3) → Tokyo=3pts, Rome=2pts, Paris=1pt
            await api("POST", `/trips/${tripId}/rank-polls/${demoId}/rank`, {
              rankings: [
                { option_id: opts[0], rank: 1 },
                { option_id: opts[2], rank: 2 },
                { option_id: opts[1], rank: 3 },
              ],
            });

            // Get results: Tokyo=8pts, Paris=6pts, Rome=4pts
            return api("GET", `/trips/${tripId}/rank-polls/${demoId}`);
          }}
        />
      </Section>

      {/* ── 9  DELETE POLL ──────────────────────────────────────────── */}
      <Section
        title="9 · Delete Poll"
        description="DELETE /rank-polls/:pollId — removes poll and all rankings."
      >
        <TestButton
          label="Delete poll"
          onRun={() => api("DELETE", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
        <TestButton
          label="Verify deleted (expect 404)"
          onRun={() => api("GET", `/trips/${tripId}/rank-polls/${pollId}`)}
        />
      </Section>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f2f5" },
  container: { padding: 16, paddingTop: 20 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 4 },
  subheading: { fontSize: 14, color: "#666", marginBottom: 20 },
});
