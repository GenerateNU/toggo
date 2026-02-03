import { getAuthToken } from "@/api/client";
import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface ServerMessage {
  type: string;
  events?: Array<{
    topic: string;
    trip_id: string;
    data: unknown;
    timestamp: string;
  }>;
  error?: string;
  timestamp: string;
}

const resolveBaseUrl = (): string => {
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoConfig?.hostUri ??
    constants.expoGoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return host;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname;
  }

  return "localhost";
};

const HOST = resolveBaseUrl();
const API_URL = `http://${HOST}:8000`;
const WS_URL = `ws://${HOST}:8000/ws`;

export default function TestRealtimeScreen() {
  const [connected, setConnected] = useState(false);
  const [tripId, setTripId] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [newTripName, setNewTripName] = useState("");
  const [createTripName, setCreateTripName] = useState("");
  const [budgetMin, setBudgetMin] = useState("0");
  const [budgetMax, setBudgetMax] = useState("1000");
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addLog("Already connected");
      return;
    }

    addLog(`Connecting to ${WS_URL}...`);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
      addLog("✅ Connected to WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        if (message.type === "events" && message.events) {
          message.events.forEach((evt) => {
            addLog(
              `📥 Event: ${evt.topic}\nTrip: ${evt.trip_id}\nData: ${JSON.stringify(evt.data, null, 2)}`,
            );
          });
        } else if (message.type === "pong") {
          addLog("🏓 Pong received");
        } else if (message.type === "error") {
          addLog(`❌ Error: ${message.error}`);
        } else {
          addLog(`📨 Message: ${JSON.stringify(message)}`);
        }
      } catch {
        addLog(`📨 Raw message: ${event.data}`);
      }
    };

    ws.onerror = (error) => {
      addLog(`❌ WebSocket error: ${JSON.stringify(error)}`);
    };

    ws.onclose = (event) => {
      setConnected(false);
      setSubscribed(false);
      addLog(`🔌 Disconnected (code: ${event.code})`);
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const subscribe = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog("Not connected");
      return;
    }
    if (!tripId.trim()) {
      addLog("Enter a trip ID first");
      return;
    }

    const message = JSON.stringify({
      type: "subscribe",
      trip_id: tripId.trim(),
    });
    wsRef.current.send(message);
    setSubscribed(true);
    addLog(`📡 Subscribed to trip: ${tripId}`);
  };

  const unsubscribe = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog("Not connected");
      return;
    }

    const message = JSON.stringify({
      type: "unsubscribe",
      trip_id: tripId.trim(),
    });
    wsRef.current.send(message);
    setSubscribed(false);
    addLog(`🚫 Unsubscribed from trip: ${tripId}`);
  };

  const sendPing = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog("Not connected");
      return;
    }

    wsRef.current.send(JSON.stringify({ type: "ping" }));
    addLog("🏓 Ping sent");
  };

  const updateTripFromApp = async () => {
    if (!tripId.trim()) {
      addLog("Enter a trip ID first");
      return;
    }
    if (!newTripName.trim()) {
      addLog("Enter a new trip name first");
      return;
    }

    addLog(`📤 Updating trip ${tripId} to "${newTripName}" from app...`);

    try {
      const response = await fetch(`${API_URL}/api/test/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTripName }),
      });

      if (response.ok) {
        const data = await response.json();
        addLog(
          `✅ Trip updated successfully:\n${JSON.stringify(data, null, 2)}`,
        );
      } else {
        const errorText = await response.text();
        addLog(`❌ Update failed: ${response.status}\n${errorText}`);
      }
    } catch (error) {
      addLog(`❌ Request error: ${error}`);
    }
  };

  const getTrip = async () => {
    if (!tripId.trim()) {
      addLog("Enter a trip ID first");
      return;
    }

    addLog(`📤 Fetching trip ${tripId}...`);

    try {
      const response = await fetch(`${API_URL}/api/test/trips/${tripId}`);

      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Trip fetched:\n${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        addLog(`❌ Fetch failed: ${response.status}\n${errorText}`);
      }
    } catch (error) {
      addLog(`❌ Request error: ${error}`);
    }
  };

  const createTrip = async () => {
    if (!createTripName.trim()) {
      addLog("Enter a trip name first");
      return;
    }

    const min = parseInt(budgetMin) || 0;
    const max = parseInt(budgetMax) || 0;

    if (min < 0 || max < 0 || max < min) {
      addLog("Invalid budget values");
      return;
    }

    addLog(`📤 Creating trip "${createTripName}"...`);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/v1/trips`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: createTripName,
          budget_min: min,
          budget_max: max,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addLog(
          `✅ Trip created successfully!\nID: ${data.id}\n${JSON.stringify(data, null, 2)}`,
        );
        setTripId(data.id);
        setCreateTripName("");
      } else {
        const errorText = await response.text();
        addLog(`❌ Create failed: ${response.status}\n${errorText}`);
      }
    } catch (error) {
      addLog(`❌ Request error: ${error}`);
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Realtime Test</Text>
      <Text style={styles.subtitle}>
        API: {API_URL} | WS: {WS_URL}
      </Text>

      {/* Connection Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Connection: {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </Text>
        <View style={styles.row}>
          <Button title="Connect" onPress={connect} disabled={connected} />
          <Button
            title="Disconnect"
            onPress={disconnect}
            disabled={!connected}
          />
          <Button title="Ping" onPress={sendPing} disabled={!connected} />
        </View>
      </View>

      {/* Subscription Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Trip ID (UUID)"
          value={tripId}
          onChangeText={setTripId}
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <Button
            title="Subscribe"
            onPress={subscribe}
            disabled={!connected || subscribed}
          />
          <Button
            title="Unsubscribe"
            onPress={unsubscribe}
            disabled={!connected || !subscribed}
          />
          <Button title="Get Trip" onPress={getTrip} />
        </View>
      </View>

      {/* Create Trip */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Trip (with your JWT)</Text>
        <TextInput
          style={styles.input}
          placeholder="Trip name"
          value={createTripName}
          onChangeText={setCreateTripName}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.smallInput]}
            placeholder="Min Budget"
            value={budgetMin}
            onChangeText={setBudgetMin}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.smallInput]}
            placeholder="Max Budget"
            value={budgetMax}
            onChangeText={setBudgetMax}
            keyboardType="numeric"
          />
        </View>
        <Button title="Create Trip" onPress={createTrip} />
      </View>

      {/* Update Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Trip (triggers event)</Text>
        <TextInput
          style={styles.input}
          placeholder="New trip name"
          value={newTripName}
          onChangeText={setNewTripName}
        />
        <Button title="Update Trip from App" onPress={updateTripFromApp} />
      </View>

      {/* Logs */}
      <View style={styles.logsSection}>
        <View style={styles.logsHeader}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <Button title="Clear" onPress={() => setLogs([])} />
        </View>
        <ScrollView style={styles.logsContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logItem}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
  },
  section: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  smallInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  helpText: {
    fontSize: 11,
    color: "#666",
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  logsSection: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 4,
    padding: 8,
  },
  logItem: {
    fontSize: 11,
    color: "#00ff00",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 4,
  },
});
