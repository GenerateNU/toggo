import { getAuthToken } from "@/api/client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

// ─── Config ──────────────────────────────────────────────────────────────────
const BASE = "http://0.0.0.0:8000/api/v1";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TestResult {
  status: number;
  ok: boolean;
  data: any;
  duration: number;
}

// ─── API helper ──────────────────────────────────────────────────────────────
async function api(
  method: string,
  path: string,
  body?: any
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

// ─── Shared state across tests ───────────────────────────────────────────────
let tripId = "";
let pollId = "";
let optionIds: string[] = [];

// ─── Ensure user exists ──────────────────────────────────────────────────────
async function ensureUser(): Promise<TestResult> {
  const check = await api("GET", "/users/me");
  if (check.ok) return check;
  return api("POST", "/users", {
    name: "Test User",
    username: "testuser_poll",
    phone_number: "+12025551234",
  });
}

// ─── Setup helpers ───────────────────────────────────────────────────────────
async function setupTrip(): Promise<TestResult> {
  const res = await api("POST", "/trips", {
    name: "Poll Test Trip",
    budget_min: 100,
    budget_max: 5000,
  });
  if (res.ok) tripId = res.data.id;
  return res;
}

// ─── Result display component ────────────────────────────────────────────────
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 4, flexWrap: "wrap" },
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

// ─── Test button component ───────────────────────────────────────────────────
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
    backgroundColor: "#4a90d9",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  txt: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

// ─── Section wrapper ─────────────────────────────────────────────────────────
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function TestPollScreen() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.container}>
      <Text style={s.heading}>Poll API Test Suite</Text>
      <Text style={s.subheading}>
        Each section tests a group of endpoints. Tap a button to run a test and
        see the response inline.
      </Text>

      {/* ── 0  SETUP ────────────────────────────────────────────────── */}
      <Section
        title="0 · Setup"
        description="Ensure user exists and create a trip for all subsequent tests."
      >
        <TestButton
          label="Ensure User"
          onRun={async () => ensureUser()}
        />
        <TestButton
          label="Create Trip"
          onRun={async () => setupTrip()}
        />
      </Section>

      {/* ── 1  CREATE POLL ──────────────────────────────────────────── */}
      <Section
        title="1 · Create Poll"
        description="POST /trips/:tripID/vote-polls — creates polls with options."
      >
        <TestButton
          label="Create valid poll (3 options)"
          onRun={async () => {
            const res = await api("POST", `/trips/${tripId}/vote-polls`, {
              question: "Where should we eat?",
              poll_type: "single",
              options: [
                { name: "Sushi", option_type: "custom" },
                { name: "Tacos", option_type: "custom" },
                { name: "Pizza", option_type: "custom" },
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
          label="❌ Missing question (expect 422)"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls`, {
              poll_type: "single",
              options: [{ name: "A", option_type: "custom" }],
            })
          }
        />
        <TestButton
          label="❌ No options (expect 422)"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls`, {
              question: "Bad poll",
              poll_type: "single",
              options: [],
            })
          }
        />
        <TestButton
          label="❌ Empty option content (expect 422)"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls`, {
              question: "Bad poll",
              poll_type: "single",
              options: [{ name: "", option_type: "custom" }],
            })
          }
        />
      </Section>

      {/* ── 2  GET POLL ─────────────────────────────────────────────── */}
      <Section
        title="2 · Get Poll"
        description="GET /trips/:tripID/vote-polls/:pollID — retrieves a single poll."
      >
        <TestButton
          label="Get created poll"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
        <TestButton
          label="❌ Get non-existent poll (expect 404)"
          onRun={() =>
            api(
              "GET",
              `/trips/${tripId}/vote-polls/00000000-0000-0000-0000-000000000000`
            )
          }
        />
      </Section>

      {/* ── 3  UPDATE POLL ──────────────────────────────────────────── */}
      <Section
        title="3 · Update Poll"
        description="PATCH /trips/:tripID/vote-polls/:pollID — updates question or deadline."
      >
        <TestButton
          label="Update question text"
          onRun={() =>
            api("PATCH", `/trips/${tripId}/vote-polls/${pollId}`, {
              question: "Where should we eat dinner?",
            })
          }
        />
        <TestButton
          label="Set deadline (future)"
          onRun={() => {
            const future = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString();
            return api("PATCH", `/trips/${tripId}/vote-polls/${pollId}`, {
              deadline: future,
            });
          }}
        />
        <TestButton
          label="Verify update (GET)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
      </Section>

      {/* ── 4  OPTIONS (Add / Remove) ───────────────────────────────── */}
      <Section
        title="4 · Options"
        description="POST & DELETE /trips/:tripID/vote-polls/:pollID/options"
      >
        <TestButton
          label="Add option 'Burgers'"
          onRun={async () => {
            const res = await api(
              "POST",
              `/trips/${tripId}/vote-polls/${pollId}/options`,
              { name: "Burgers", option_type: "custom" }
            );
            if (res.ok && res.data?.id) optionIds.push(res.data.id);
            return res;
          }}
        />
        <TestButton
          label="Verify option added (GET poll)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
        <TestButton
          label="Remove last option"
          onRun={async () => {
            const id = optionIds.pop();
            if (!id)
              return {
                status: 0,
                ok: false,
                data: "No option to remove",
                duration: 0,
              };
            return api(
              "DELETE",
              `/trips/${tripId}/vote-polls/${pollId}/options/${id}`
            );
          }}
        />
        <TestButton
          label="Verify option removed (GET poll)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
      </Section>

      {/* ── 5  VOTING ───────────────────────────────────────────────── */}
      <Section
        title="5 · Voting"
        description="POST /trips/:tripID/vote-polls/:pollID/vote — cast and change votes."
      >
        <TestButton
          label="Vote for first option"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls/${pollId}/vote`, {
              option_ids: [optionIds[0]],
            })
          }
        />
        <TestButton
          label="Check vote counts (GET poll)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
        <TestButton
          label="Change vote to second option"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls/${pollId}/vote`, {
              option_ids: [optionIds[1]],
            })
          }
        />
        <TestButton
          label="Verify changed vote (GET poll)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
        <TestButton
          label="Unvote (empty option_ids)"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls/${pollId}/vote`, {
              option_ids: [],
            })
          }
        />
        <TestButton
          label="Verify unvoted (GET poll)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
      </Section>

      {/* ── 6  MULTI-VOTE ───────────────────────────────────────────── */}
      <Section
        title="6 · Multi-Vote Poll"
        description="Create a poll with allows_multiple_votes=true, then vote for multiple."
      >
        <TestButton
          label="Create multi-vote poll"
          onRun={async () => {
            const res = await api("POST", `/trips/${tripId}/vote-polls`, {
              question: "What activities?",
              poll_type: "multi",
              options: [
                { name: "Hiking", option_type: "custom" },
                { name: "Swimming", option_type: "custom" },
                { name: "Museum", option_type: "custom" },
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
          label="Vote for 2 options"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls/${pollId}/vote`, {
              option_ids: [optionIds[0], optionIds[1]],
            })
          }
        />
        <TestButton
          label="Verify multi-vote counts"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
        <TestButton
          label="❌ Multi-vote on single-vote poll (expect 409)"
          onRun={async () => {
            // create a single-vote poll first
            const p = await api("POST", `/trips/${tripId}/vote-polls`, {
              question: "Single only?",
              poll_type: "single",
              options: [{ name: "Yes", option_type: "custom" }, { name: "No", option_type: "custom" }],
            });
            if (!p.ok) return p;
            const opts = (p.data.options || []).map((o: any) => o.id);
            return api("POST", `/trips/${tripId}/vote-polls/${p.data.id}/vote`, {
              option_ids: opts, // 2 options on single-vote → should fail
            });
          }}
        />
      </Section>

      {/* ── 7  LIST / PAGINATION ────────────────────────────────────── */}
      <Section
        title="7 · List & Pagination"
        description="GET /trips/:tripID/vote-polls?limit=N&cursor=…"
      >
        <TestButton
          label="Seed 3 more polls"
          onRun={async () => {
            const results = [];
            for (let i = 1; i <= 3; i++) {
              results.push(
                await api("POST", `/trips/${tripId}/vote-polls`, {
                  question: `Pagination poll ${i}`,
                  poll_type: "single",
                  options: [{ name: "A", option_type: "custom" }, { name: "B", option_type: "custom" }],
                })
              );
            }
            const ok = results.every((r) => r.ok);
            return {
              status: ok ? 201 : 400,
              ok,
              data: results.map((r) => ({
                status: r.status,
                id: r.data?.id,
              })),
              duration: results.reduce((s, r) => s + r.duration, 0),
            };
          }}
        />
        <TestButton
          label="List all (limit=10)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls?limit=10`)}
        />
        <TestButton
          label="Page 1 (limit=2)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls?limit=2`)}
        />
        <TestButton
          label="Page 2 (use cursor from page 1)"
          onRun={async () => {
            const page1 = await api(
              "GET",
              `/trips/${tripId}/vote-polls?limit=2`
            );
            if (!page1.ok || !page1.data?.next_cursor) {
              return {
                status: 0,
                ok: false,
                data: "No cursor from page 1",
                duration: page1.duration,
              };
            }
            return api(
              "GET",
              `/trips/${tripId}/vote-polls?limit=2&cursor=${page1.data.next_cursor}`
            );
          }}
        />
        <TestButton
          label="❌ Invalid cursor (expect 400)"
          onRun={() =>
            api(
              "GET",
              `/trips/${tripId}/vote-polls?limit=2&cursor=not-a-valid-cursor`
            )
          }
        />
      </Section>

      {/* ── 8  DELETE ───────────────────────────────────────────────── */}
      <Section
        title="8 · Delete Poll"
        description="DELETE /trips/:tripID/vote-polls/:pollID"
      >
        <TestButton
          label="Create poll to delete"
          onRun={async () => {
            const res = await api("POST", `/trips/${tripId}/vote-polls`, {
              question: "Delete me",
              poll_type: "single",
              options: [{ name: "X", option_type: "custom" }],
            });
            if (res.ok) pollId = res.data.id;
            return res;
          }}
        />
        <TestButton
          label="Delete poll (expect 204)"
          onRun={() =>
            api("DELETE", `/trips/${tripId}/vote-polls/${pollId}`)
          }
        />
        <TestButton
          label="Verify deleted (expect 404)"
          onRun={() => api("GET", `/trips/${tripId}/vote-polls/${pollId}`)}
        />
      </Section>

      {/* ── 9  DEADLINE ENFORCEMENT ─────────────────────────────────── */}
      <Section
        title="9 · Deadline Enforcement"
        description="Set a past deadline, then try to vote — should be rejected."
      >
        <TestButton
          label="Create poll + set past deadline"
          onRun={async () => {
            const create = await api("POST", `/trips/${tripId}/vote-polls`, {
              question: "Expired poll",
              poll_type: "single",
              options: [{ name: "Opt", option_type: "custom" }],
            });
            if (!create.ok) return create;
            pollId = create.data.id;
            optionIds = (create.data.options || []).map((o: any) => o.id);
            const past = new Date(Date.now() - 60_000).toISOString();
            return api("PATCH", `/trips/${tripId}/vote-polls/${pollId}`, {
              deadline: past,
            });
          }}
        />
        <TestButton
          label="❌ Vote after deadline (expect 409)"
          onRun={() =>
            api("POST", `/trips/${tripId}/vote-polls/${pollId}/vote`, {
              option_ids: [optionIds[0]],
            })
          }
        />
      </Section>

      {/* ── 10  END-TO-END FLOW + REALTIME ──────────────────────────── */}
      <E2ESection />

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ─── End-to-end flow with realtime ───────────────────────────────────────────
const WS_URL = "ws://0.0.0.0:8000/ws";

interface RealtimeEvent {
  topic: string;
  trip_id: string;
  data: any;
  timestamp: string;
}

function E2ESection() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [steps, setSteps] = useState<{ label: string; result: TestResult | null }[]>([]);
  const [running, setRunning] = useState(false);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [livePoll, setLivePoll] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const e2eTripId = useRef("");
  const livePollId = useRef("");

  const addEvent = (evt: RealtimeEvent) =>
    setEvents((prev) => [evt, ...prev]);

  // Re-fetch the poll to update the live UI card
  const refreshPoll = async () => {
    if (!livePollId.current || !e2eTripId.current) return;
    const res = await api("GET", `/trips/${e2eTripId.current}/vote-polls/${livePollId.current}`);
    if (res.ok) setLivePoll(res.data);
  };

  const connectWs = (): Promise<WebSocket> =>
    new Promise((resolve, reject) => {
      setWsStatus("connecting");
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setWsStatus("connected");
        wsRef.current = ws;
        resolve(ws);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "events" && msg.events) {
            msg.events.forEach((ev: RealtimeEvent) => {
              addEvent(ev);
              // Auto-refresh the live poll card when we get a poll event
              if (ev.topic.startsWith("poll.") && ev.topic !== "poll.deleted") {
                refreshPoll();
              } else if (ev.topic === "poll.deleted") {
                setLivePoll((prev: any) =>
                  prev ? { ...prev, _deleted: true } : null
                );
              }
            });
          }
        } catch {}
      };
      ws.onerror = () => reject(new Error("WebSocket error"));
      ws.onclose = () => setWsStatus("disconnected");
    });

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const updateStep = (idx: number, result: TestResult) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, result } : s)));

  const runE2E = async () => {
    setRunning(true);
    setEvents([]);
    setLivePoll(null);
    livePollId.current = "";

    const plan = [
      "1. Ensure user",
      "2. Create trip",
      "3. Connect WebSocket",
      "4. Subscribe to trip",
      "5. Create multi-vote poll (expect poll.created)",
      "6. Add option 'Berlin' (before any votes)",
      "7. Vote for Paris + Tokyo (expect poll.vote_added)",
      "8. Change vote to Tokyo + Sydney (expect poll.vote_added)",
      "9. Update question (expect poll.updated)",
      "10. Delete poll (expect poll.deleted)",
      "11. Disconnect WebSocket",
    ];
    setSteps(plan.map((label) => ({ label, result: null })));

    const ok = (data: any, dur: number): TestResult => ({ status: 200, ok: true, data, duration: dur });
    const fail = (msg: string): TestResult => ({ status: 0, ok: false, data: msg, duration: 0 });

    try {
      // 1  ensure user
      const user = await ensureUser();
      updateStep(0, user);
      if (!user.ok) { setRunning(false); return; }

      // 2  create trip
      const trip = await setupTrip();
      updateStep(1, trip);
      if (!trip.ok) { setRunning(false); return; }
      e2eTripId.current = trip.data.id;

      // 3  connect ws
      let ws: WebSocket;
      try {
        const t0 = Date.now();
        ws = await connectWs();
        updateStep(2, ok("Connected", Date.now() - t0));
      } catch (e: any) {
        updateStep(2, fail(e.message));
        setRunning(false);
        return;
      }

      // 4  subscribe
      ws.send(JSON.stringify({ type: "subscribe", trip_id: e2eTripId.current }));
      updateStep(3, ok(`Subscribed to ${e2eTripId.current}`, 0));
      await sleep(500);

      // 5  create multi-vote poll
      const poll = await api("POST", `/trips/${e2eTripId.current}/vote-polls`, {
        question: "E2E: Where should we travel?",
        poll_type: "multi",
        options: [
          { name: "Paris", option_type: "custom" },
          { name: "Tokyo", option_type: "custom" },
          { name: "Sydney", option_type: "custom" },
        ],
      });
      updateStep(4, poll);
      if (!poll.ok) { setRunning(false); return; }
      const ePollId = poll.data.id;
      livePollId.current = ePollId;
      setLivePoll(poll.data);
      const eOpts = (poll.data.options || []).map((o: any) => ({ id: o.id, name: o.name }));
      await sleep(1000);

      // 6  add option Berlin (must happen before any votes)
      const addOpt = await api("POST", `/trips/${e2eTripId.current}/vote-polls/${ePollId}/options`, {
        name: "Berlin",
        option_type: "custom",
      });
      updateStep(5, addOpt);
      await sleep(1000);

      // 7  vote for Paris + Tokyo (multi-vote)
      const voteA = await api("POST", `/trips/${e2eTripId.current}/vote-polls/${ePollId}/vote`, {
        option_ids: [eOpts[0].id, eOpts[1].id],
      });
      updateStep(6, voteA);
      await sleep(1000);

      // 8  change vote to Tokyo + Sydney
      const voteB = await api("POST", `/trips/${e2eTripId.current}/vote-polls/${ePollId}/vote`, {
        option_ids: [eOpts[1].id, eOpts[2].id],
      });
      updateStep(7, voteB);
      await sleep(1000);

      // 9  update question
      const upd = await api("PATCH", `/trips/${e2eTripId.current}/vote-polls/${ePollId}`, {
        question: "E2E: Where should we travel? (updated!)",
      });
      updateStep(8, upd);
      await sleep(1000);

      // 10  delete poll
      const del = await api("DELETE", `/trips/${e2eTripId.current}/vote-polls/${ePollId}`);
      updateStep(9, del);
      await sleep(1000);

      // 11  disconnect
      ws.close();
      wsRef.current = null;
      updateStep(10, ok("Disconnected", 0));
    } catch (e: any) {
      setSteps((prev) => [
        ...prev,
        { label: "ERROR", result: fail(e.message) },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const wsDot =
    wsStatus === "connected" ? "#4caf50" : wsStatus === "connecting" ? "#ff9800" : "#999";

  return (
    <View style={sec.card}>
      <Text style={sec.title}>10 · End-to-End Flow</Text>
      <Text style={sec.desc}>
        Runs the full lifecycle with a multi-vote poll. Watch the live poll card
        update in real time as WebSocket events arrive.
      </Text>

      {/* WS status */}
      <View style={e2e.statusRow}>
        <View style={[e2e.dot, { backgroundColor: wsDot }]} />
        <Text style={e2e.statusTxt}>WebSocket: {wsStatus}</Text>
      </View>

      {/* Run button */}
      <TouchableOpacity
        style={[tb.btn, running && { opacity: 0.6 }]}
        onPress={runE2E}
        disabled={running}
      >
        {running ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={tb.txt}>▶ Run Full E2E Flow</Text>
        )}
      </TouchableOpacity>

      {/* ── Live Poll Card ─────────────────────────────────────────── */}
      {livePoll && <LivePollCard poll={livePoll} />}

      {/* Steps */}
      {steps.length > 0 && (
        <View style={e2e.stepsWrap}>
          <Text style={e2e.subhead}>Steps</Text>
          {steps.map((step, i) => (
            <View key={i} style={e2e.stepRow}>
              <Text style={e2e.stepIcon}>
                {step.result === null
                  ? "⏳"
                  : step.result.ok
                    ? "✅"
                    : "❌"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={e2e.stepLabel}>{step.label}</Text>
                {step.result && (
                  <Text style={e2e.stepDetail} numberOfLines={2}>
                    {step.result.status} · {step.result.duration}ms ·{" "}
                    {typeof step.result.data === "string"
                      ? step.result.data
                      : JSON.stringify(step.result.data).slice(0, 120)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Realtime event log */}
      <View style={e2e.eventsWrap}>
        <Text style={e2e.subhead}>
          Realtime Events ({events.length})
        </Text>
        {events.length === 0 && (
          <Text style={e2e.emptyTxt}>No events yet — run the flow above</Text>
        )}
        <ScrollView style={e2e.eventScroll} nestedScrollEnabled>
          {events.map((ev, i) => (
            <ExpandableEventCard key={i} event={ev} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Live poll visualization ─────────────────────────────────────────────────
function LivePollCard({ poll }: { poll: any }) {
  if (poll._deleted) {
    return (
      <View style={[lp.card, { borderColor: "#f44336", backgroundColor: "#fce4e4" }]}>
        <Text style={lp.deletedTxt}>🗑 Poll deleted</Text>
        <Text style={lp.question}>{poll.question}</Text>
      </View>
    );
  }

  const totalVotes = (poll.options || []).reduce(
    (sum: number, o: any) => sum + (o.vote_count || 0),
    0
  );

  return (
    <View style={lp.card}>
      <View style={lp.header}>
        <Text style={lp.badge}>{poll.poll_type?.toUpperCase()}</Text>
        <Text style={lp.liveTag}>● LIVE</Text>
      </View>
      <Text style={lp.question}>{poll.question}</Text>
      <Text style={lp.meta}>
        {(poll.options || []).length} options · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </Text>
      {(poll.options || []).map((opt: any) => {
        const pct = totalVotes > 0 ? (opt.vote_count / totalVotes) * 100 : 0;
        return (
          <View key={opt.id} style={lp.optRow}>
            <View style={lp.optInfo}>
              <Text style={lp.optName}>
                {opt.voted ? "☑ " : "☐ "}
                {opt.name}
              </Text>
              <Text style={lp.optCount}>
                {opt.vote_count} ({pct.toFixed(0)}%)
              </Text>
            </View>
            <View style={lp.barBg}>
              <View
                style={[
                  lp.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: opt.voted ? "#4a90d9" : "#ccc",
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const lp = StyleSheet.create({
  card: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#4a90d9",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f0f7ff",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    backgroundColor: "#4a90d9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  liveTag: { fontSize: 12, fontWeight: "700", color: "#4caf50" },
  question: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 4 },
  meta: { fontSize: 12, color: "#888", marginBottom: 10 },
  deletedTxt: { fontSize: 15, fontWeight: "700", color: "#f44336", marginBottom: 4 },
  optRow: { marginBottom: 8 },
  optInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  optName: { fontSize: 13, fontWeight: "600", color: "#333" },
  optCount: { fontSize: 12, color: "#666" },
  barBg: { height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
});

// ─── Expandable event card ───────────────────────────────────────────────────
function ExpandableEventCard({ event }: { event: RealtimeEvent }) {
  const [expanded, setExpanded] = useState(false);
  const raw = JSON.stringify(event.data, null, 2);
  const isLong = raw.length > 120;
  const color = event.topic.includes("created")
    ? "#4caf50"
    : event.topic.includes("deleted")
      ? "#f44336"
      : event.topic.includes("vote")
        ? "#2196f3"
        : "#ff9800";

  return (
    <View style={[e2e.eventCard, { borderLeftColor: color }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={e2e.eventTopic}>{event.topic}</Text>
        <Text style={e2e.eventTime}>
          {new Date(event.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      {isLong && !expanded ? (
        <Text style={e2e.eventData} numberOfLines={2}>
          {raw}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
          <Text style={e2e.eventData} selectable>
            {raw}
          </Text>
        </ScrollView>
      )}
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 12, color: "#555", fontWeight: "600" }}>
            {expanded ? "▲ Collapse" : "▼ Expand"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const e2e = StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusTxt: { fontSize: 13, color: "#555", fontWeight: "600" },
  stepsWrap: { marginTop: 16 },
  subhead: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 8 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  stepIcon: { fontSize: 16, marginRight: 8, marginTop: 1 },
  stepLabel: { fontSize: 13, fontWeight: "600", color: "#222" },
  stepDetail: { fontSize: 11, fontFamily: "monospace", color: "#666", marginTop: 2 },
  eventsWrap: { marginTop: 20 },
  emptyTxt: { fontSize: 12, color: "#aaa", fontStyle: "italic" },
  eventScroll: { maxHeight: 400 },
  eventCard: {
    backgroundColor: "#f9f9f9",
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  eventTopic: { fontSize: 13, fontWeight: "700", color: "#222" },
  eventTime: { fontSize: 11, color: "#999", marginTop: 2 },
  eventData: { fontSize: 11, fontFamily: "monospace", color: "#444", marginTop: 4 },
});

// ─── Root styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f2f5" },
  container: { padding: 16, paddingTop: 20 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 4 },
  subheading: { fontSize: 14, color: "#666", marginBottom: 20 },
});
