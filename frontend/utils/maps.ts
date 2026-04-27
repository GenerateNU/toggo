import { Linking, Platform } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MapProvider = "apple" | "google";

// ─── Provider resolution ─────────────────────────────────────────────────────

export function resolveMapProvider(
  appleEnabled?: boolean,
  googleEnabled?: boolean,
): MapProvider {
  if (appleEnabled && googleEnabled) {
    return Platform.OS === "ios" ? "apple" : "google";
  }
  if (appleEnabled) return "apple";
  if (googleEnabled) return "google";
  return Platform.OS === "ios" ? "apple" : "google";
}

export function mapProviderLabel(provider: MapProvider): string {
  return provider === "apple" ? "Apple Maps" : "Google Maps";
}

// ─── Open in maps ─────────────────────────────────────────────────────────────

type OpenInMapsParams = {
  lat: number;
  lng: number;
  label: string;
  provider: MapProvider;
};

export async function openInMaps({
  lat,
  lng,
  label,
  provider,
}: OpenInMapsParams): Promise<void> {
  const encodedLabel = encodeURIComponent(label);

  if (provider === "apple") {
    await Linking.openURL(
      `http://maps.apple.com/?ll=${lat},${lng}&q=${encodedLabel}`,
    );
    return;
  }

  const nativeGoogleURL = `comgooglemaps://?q=${lat},${lng}`;
  const webGoogleURL = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  let canOpenNative = false;
  try {
    canOpenNative = await Linking.canOpenURL(nativeGoogleURL);
  } catch {
    // In case canOpenURL throws an error, we default to opening the web URL
  }
  if (canOpenNative) {
    await Linking.openURL(nativeGoogleURL);
  } else {
    await Linking.openURL(webGoogleURL);
  }
}