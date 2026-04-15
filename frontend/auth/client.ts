import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";

const SUPABASE_LOCAL_PORT = 54321;

const resolveSupabaseUrl = (): string => {
  const isProd = process.env.EXPO_PUBLIC_ENVIRONMENT === "prod";
  const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;

  if (isProd) {
    if (!configuredUrl) {
      throw new Error(
        "EXPO_PUBLIC_SUPABASE_URL is required in production. Set it in your environment.",
      );
    }
    return configuredUrl;
  }

  // Dev: prefer explicitly configured URL (set to Mac IP in .env.local for physical devices)
  if (configuredUrl) {
    return configuredUrl;
  }

  // Fallback: detect host from Expo dev server (works in Expo Go / simulators)
  const constants = Constants as Record<string, any>;
  const debuggerHost =
    constants.expoGoConfig?.debuggerHost ??
    constants.expoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:${SUPABASE_LOCAL_PORT}`;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    return `${protocol}//${hostname}:${SUPABASE_LOCAL_PORT}`;
  }

  if (Platform.OS === "android" && __DEV__) {
    return `http://10.0.2.2:${SUPABASE_LOCAL_PORT}`;
  }

  return `http://localhost:${SUPABASE_LOCAL_PORT}`;
};

const supabaseUrl = resolveSupabaseUrl();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
