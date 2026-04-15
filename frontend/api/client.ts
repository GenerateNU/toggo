// api/client.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type RequestConfig<TBody = unknown> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: TBody;
  signal?: AbortSignal;
};

export type ResponseErrorConfig<T = unknown> =
  | { status?: number; message?: string; data?: T }
  | Error;

type ClientResponse<TData> = { data: TData };

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const supabaseTokenKey = allKeys.find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );

    if (!supabaseTokenKey) {
      return null;
    }

    const tokenString = await AsyncStorage.getItem(supabaseTokenKey);
    if (!tokenString) return null;

    const parsedToken = JSON.parse(tokenString);
    return parsedToken?.access_token ?? null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
};

const resolveBaseUrl = (): string => {
  const isProd = process.env.EXPO_PUBLIC_ENVIRONMENT === "prod";
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (isProd) {
    if (!configuredUrl) {
      throw new Error(
        "EXPO_PUBLIC_API_BASE_URL is required in production. Set it in your environment.",
      );
    }
    return configuredUrl;
  }

  // Detect LAN host from Expo dev server (works in Expo Go on physical devices)
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoGoConfig?.debuggerHost ??
    constants.expoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;

  const lanHost = debuggerHost ? debuggerHost.split(":")[0] : null;

  // If a URL is explicitly configured but points to loopback, swap in the detected LAN IP
  if (configuredUrl) {
    if (
      lanHost &&
      (configuredUrl.includes("127.0.0.1") ||
        configuredUrl.includes("localhost"))
    ) {
      return configuredUrl.replace(/127\.0\.0\.1|localhost/, lanHost);
    }
    return configuredUrl;
  }

  if (lanHost) {
    return `http://${lanHost}:8000`;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  if (Platform.OS === "android" && __DEV__) {
    return "http://10.0.2.2:8000";
  }

  return "http://localhost:8000";
};

let _baseUrl: string | null = null;
const getBaseUrl = (): string => {
  if (!_baseUrl) {
    _baseUrl = resolveBaseUrl();
    console.log("[api/client] BASE_URL:", _baseUrl);
  }
  return _baseUrl;
};

const getLanHost = (): string | null => {
  const constants = Constants as Record<string, any>;

  // Try Expo runtime constants first (populated in Expo Go / dev clients)
  const candidates: unknown[] = [
    constants.expoGoConfig?.debuggerHost,
    constants.expoConfig?.hostUri,
    constants.manifest?.debuggerHost,
    constants.manifest2?.extra?.expoClient?.hostUri,
    constants.manifest2?.hostUri,
  ];

  for (const candidate of candidates) {
    if (candidate) {
      const host = String(candidate).split(":")[0];
      if (host && host !== "localhost" && host !== "127.0.0.1") return host;
    }
  }

  // Fallback: extract from EXPO_PUBLIC_API_BASE_URL if it has a LAN IP.
  // Lets simulator dev builds pick up the correct host without extra config.
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configuredUrl) {
    const match = configuredUrl.match(/^https?:\/\/([^/:]+)/);
    const host = match?.[1];
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  }

  return null;
};

/**
 * Recursively rewrites LocalStack loopback URLs in API responses to use the
 * Expo LAN IP. Needed so presigned URLs embedded in any response (trips,
 * activities, avatars, etc.) are reachable from physical devices in dev.
 * In production S3 URLs never contain 127.0.0.1 so this is a no-op.
 */
function rewriteDevUrls<T>(data: T): T {
  const lanHost = getLanHost();
  if (!lanHost) return data;

  const rewrite = (value: unknown): unknown => {
    if (typeof value === "string") {
      return value.replace(/127\.0\.0\.1|localhost(?=:\d{4})/, lanHost);
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, rewrite(v)]),
      );
    }
    return value;
  };

  return rewrite(data) as T;
}

export default async function request<TData, TError = unknown, TBody = unknown>(
  config: RequestConfig<TBody>,
): Promise<ClientResponse<TData>> {
  const token = await getAuthToken();

  let url = `${getBaseUrl()}${config.url}`;
  if (config.params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }

  let res: Response;
  try {
    res = await globalThis.fetch(url, {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(config.headers ?? {}),
      },
      body: config.data !== undefined ? JSON.stringify(config.data) : undefined,
      signal: config.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error(`[api/client] ${config.method} ${url} — network error:`, err);
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[api/client] ${config.method} ${url} failed — status: ${res.status}, body: ${text}`,
    );
    throw {
      status: res.status,
      message: text || `Request failed with ${res.status}`,
    } as ResponseErrorConfig<TError>;
  }

  if (res.status === 204) {
    return { data: undefined as unknown as TData };
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = (contentType.includes("application/json")
    ? await res.json()
    : await res.text()) as unknown as TData;

  return { data: rewriteDevUrls(data) };
}
