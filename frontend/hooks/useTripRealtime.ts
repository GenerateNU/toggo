import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

type RealtimeEvent = {
  topic: string;
  trip_id: string;
  data: unknown;
  timestamp: string;
};

type ServerMessage = {
  type: "events" | "pong" | "error";
  events?: RealtimeEvent[];
  error?: string;
  timestamp: string;
};

type EventHandler = (event: RealtimeEvent) => void;

const resolveWsUrl = (): string => {
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoConfig?.hostUri ??
    constants.expoGoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `ws://${host}:8000/ws`;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8000/ws`;
  }

  return "ws://localhost:8000/ws";
};

const WS_URL = resolveWsUrl();
const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;

export function useTripRealtime(
  tripID: string | undefined,
  onEvent: EventHandler,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);

  // Keep the callback ref up to date without reconnecting
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!tripID) return;

    unmountedRef.current = false;

    const connect = () => {
      if (unmountedRef.current) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "subscribe", trip_id: tripID }));

        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (e) => {
        try {
          const msg: ServerMessage = JSON.parse(e.data);
          if (msg.type === "events" && msg.events) {
            msg.events.forEach((evt) => onEventRef.current(evt));
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        if (!unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [tripID]);
}
