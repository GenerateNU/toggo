import { getAuthToken } from "@/api/client";
import { Screen } from "@/design-system";
import Constants from "expo-constants";
import { useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const resolveBaseUrl = (): string => {
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoConfig?.hostUri ??
    constants.expoGoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;

  if (debuggerHost) {
    return debuggerHost.split(":")[0];
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname;
  }

  return "localhost";
};

const API_URL = `http://${resolveBaseUrl()}:8000`;

export default function TestActivityFeedScreen() {
  const [tripId, setTripId] = useState("");
  const [eventId, setEventId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  };

  const authedHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const getFeed = async () => {
    if (!tripId.trim()) {
      addLog("Enter a trip ID first");
      return;
    }
    addLog(`Fetching feed for trip ${tripId}...`);
    try {
      const headers = await authedHeaders();
      const res = await fetch(
        `${API_URL}/api/v1/trips/${tripId.trim()}/activity`,
        { headers },
      );
      const body = await res.json();
      if (res.ok) {
        const events = Array.isArray(body) ? body : [];
        addLog(`Feed returned ${events.length} event(s)`);
        events.forEach((e: any) => {
          addLog(
            `  id=${e.id} topic=${e.topic} actor=${e.actor_id ?? "-"} entity=${e.entity_id ?? "-"}`,
          );
        });
      } else {
        addLog(`Error ${res.status}: ${JSON.stringify(body)}`);
      }
    } catch (err) {
      addLog(`Request error: ${err}`);
    }
  };

  const getUnreadCount = async () => {
    if (!tripId.trim()) {
      addLog("Enter a trip ID first");
      return;
    }
    addLog(`Fetching unread count for trip ${tripId}...`);
    try {
      const headers = await authedHeaders();
      const res = await fetch(
        `${API_URL}/api/v1/trips/${tripId.trim()}/activity/unread-count`,
        { headers },
      );
      const body = await res.json();
      if (res.ok) {
        addLog(`Unread count: ${body.unread_count}`);
      } else {
        addLog(`Error ${res.status}: ${JSON.stringify(body)}`);
      }
    } catch (err) {
      addLog(`Request error: ${err}`);
    }
  };

  const joinTrip = async () => {
    if (!tripId.trim()) {
      addLog("Enter a trip ID first");
      return;
    }
    addLog(`Joining trip ${tripId}...`);
    try {
      const headers = await authedHeaders();
      const meRes = await fetch(`${API_URL}/api/v1/users/me`, { headers });
      if (!meRes.ok) {
        addLog(`Failed to get current user: ${meRes.status}`);
        return;
      }
      const me = await meRes.json();
      const res = await fetch(`${API_URL}/api/v1/memberships`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: me.id,
          trip_id: tripId.trim(),
          budget_min: 0,
          budget_max: 0,
        }),
      });
      if (res.status === 201) {
        addLog(`Joined trip as user ${me.id}`);
      } else {
        const body = await res.json();
        addLog(`Error ${res.status}: ${JSON.stringify(body)}`);
      }
    } catch (err) {
      addLog(`Request error: ${err}`);
    }
  };

  const markRead = async () => {
    if (!tripId.trim() || !eventId.trim()) {
      addLog("Enter both trip ID and event ID first");
      return;
    }
    addLog(`Marking event ${eventId} as read...`);
    try {
      const headers = await authedHeaders();
      const res = await fetch(
        `${API_URL}/api/v1/trips/${tripId.trim()}/activity/${eventId.trim()}`,
        { method: "DELETE", headers },
      );
      if (res.status === 204) {
        addLog("Event marked as read (204)");
      } else {
        const body = await res.text();
        addLog(`Error ${res.status}: ${body}`);
      }
    } catch (err) {
      addLog(`Request error: ${err}`);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Activity Feed Test</Text>
        <Text style={styles.subtitle}>API: {API_URL}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Trip ID (UUID)"
            value={tripId}
            onChangeText={setTripId}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership</Text>
          <Button title="Join Trip" onPress={joinTrip} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feed</Text>
          <View style={styles.row}>
            <Button title="Get Feed" onPress={getFeed} />
            <Button title="Unread Count" onPress={getUnreadCount} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mark as Read</Text>
          <TextInput
            style={styles.input}
            placeholder="Event ID (UUID)"
            value={eventId}
            onChangeText={setEventId}
            autoCapitalize="none"
          />
          <Button title="Mark Read" onPress={markRead} />
        </View>

        <View style={styles.logsSection}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <Button title="Clear" onPress={() => setLogs([])} />
          </View>
          <ScrollView style={styles.logsContainer}>
            {logs.map((entry, index) => (
              <Text key={index} style={styles.logItem}>
                {entry}
              </Text>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
    backgroundColor: "backgroundCard",
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
  logsSection: {
    flex: 1,
    backgroundColor: "backgroundCard",
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
