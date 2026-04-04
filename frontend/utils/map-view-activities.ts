import type {
  ModelsActivity,
  ModelsActivityTimeOfDay,
} from "@/types/types.gen";

/** Mirrors API `dates[]` entries (calendar days, YYYY-MM-DD). */
export type MapViewActivityDateRange = {
  start?: string;
  end?: string;
};

/** Minimal activity fields needed to render pins on the map view screen. */
export type MapViewActivityForMap = {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  location_name?: string;
  description?: string;
  thumbnail_url?: string;
  media_url?: string;
  /** Scheduled calendar ranges from the API (no clock time). */
  dates?: MapViewActivityDateRange[];
  /** Coarse part of day: morning / afternoon / evening — not a specific clock time. */
  time_of_day?: ModelsActivityTimeOfDay;
};

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseTimeOfDayField(v: unknown): ModelsActivityTimeOfDay | undefined {
  if (v === "morning" || v === "afternoon" || v === "evening") return v;
  return undefined;
}

function parseYmdToLocalDate(ymd: string): Date | null {
  const t = ymd.trim();
  const m = ISO_DATE_ONLY.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function formatMediumDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOneDateRange(dr: MapViewActivityDateRange): string | null {
  const sRaw = dr.start?.trim();
  const eRaw = dr.end?.trim();
  if (!sRaw && !eRaw) return null;
  const ds = sRaw ? parseYmdToLocalDate(sRaw) : null;
  const de = eRaw ? parseYmdToLocalDate(eRaw) : null;
  if (ds && de && sRaw === eRaw) return formatMediumDate(ds);
  if (ds && de) return `${formatMediumDate(ds)} – ${formatMediumDate(de)}`;
  if (ds) return `From ${formatMediumDate(ds)}`;
  if (de) return `Until ${formatMediumDate(de)}`;
  return null;
}

/** Human-readable schedule from `dates` and `time_of_day` for map UI. */
export function formatMapViewActivityScheduleLine(
  activity: Pick<MapViewActivityForMap, "dates" | "time_of_day">,
): string | null {
  const dateParts =
    activity.dates
      ?.map(formatOneDateRange)
      .filter((line): line is string => Boolean(line)) ?? [];
  const dateStr = dateParts.length > 0 ? dateParts.join("; ") : null;
  const timeStr = activity.time_of_day
    ? activity.time_of_day.charAt(0).toUpperCase() +
      activity.time_of_day.slice(1)
    : null;
  const segments = [dateStr, timeStr].filter(Boolean);
  if (segments.length === 0) return null;
  return segments.join(" · ");
}

export function activityHasMapLocation(activity: ModelsActivity): boolean {
  const { location_lat: lat, location_lng: lng } = activity;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function toMapViewActivityPayload(
  activity: ModelsActivity,
): MapViewActivityForMap | null {
  if (!activityHasMapLocation(activity)) return null;
  return {
    id: activity.id ?? "",
    name: activity.name?.trim() || "Activity",
    location_lat: activity.location_lat as number,
    location_lng: activity.location_lng as number,
    location_name: activity.location_name,
    description: activity.description?.trim() || undefined,
    thumbnail_url: activity.thumbnail_url?.trim() || undefined,
    media_url: activity.media_url?.trim() || undefined,
    dates:
      activity.dates && activity.dates.length > 0
        ? activity.dates.map((d) => ({
            start: d.start,
            end: d.end,
          }))
        : undefined,
    time_of_day: activity.time_of_day,
  };
}

/** Serialize activities for `router.push({ pathname: "/map-view", params: { activities } })`. */
export function encodeMapViewActivitiesParam(
  activities: ModelsActivity[],
): string {
  const items = activities
    .map(toMapViewActivityPayload)
    .filter((a): a is MapViewActivityForMap => a !== null);
  return encodeURIComponent(JSON.stringify(items));
}

export type MapViewActivitiesInput =
  | { kind: "default" }
  | { kind: "error"; message: string }
  | { kind: "activities"; items: MapViewActivityForMap[] };

function normalizeActivitiesParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw === undefined) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === "") return undefined;
  return s;
}

export function resolveMapViewActivitiesInput(
  raw: string | string[] | undefined,
): MapViewActivitiesInput {
  const param = normalizeActivitiesParam(raw);
  if (param === undefined) return { kind: "default" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(param));
  } catch {
    return {
      kind: "error",
      message: "Could not read activity locations for the map.",
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      kind: "error",
      message: "Map activities must be a list.",
    };
  }

  const items: MapViewActivityForMap[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const lat = o.location_lat;
    const lng = o.location_lng;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    const id = typeof o.id === "string" ? o.id : "";
    const name =
      typeof o.name === "string" && o.name.trim() !== ""
        ? o.name.trim()
        : "Activity";
    const location_name =
      typeof o.location_name === "string" ? o.location_name : undefined;
    const description =
      typeof o.description === "string" && o.description.trim() !== ""
        ? o.description.trim()
        : undefined;
    const thumbnail_url =
      typeof o.thumbnail_url === "string" && o.thumbnail_url.trim() !== ""
        ? o.thumbnail_url.trim()
        : undefined;
    const media_url =
      typeof o.media_url === "string" && o.media_url.trim() !== ""
        ? o.media_url.trim()
        : undefined;

    let dates: MapViewActivityDateRange[] | undefined;
    if (Array.isArray(o.dates)) {
      const ranges: MapViewActivityDateRange[] = [];
      for (const dr of o.dates) {
        if (!dr || typeof dr !== "object") continue;
        const r = dr as Record<string, unknown>;
        const start = typeof r.start === "string" ? r.start : undefined;
        const end = typeof r.end === "string" ? r.end : undefined;
        if (start !== undefined || end !== undefined) {
          ranges.push({ start, end });
        }
      }
      if (ranges.length > 0) dates = ranges;
    }

    const time_of_day = parseTimeOfDayField(o.time_of_day);

    items.push({
      id,
      name,
      location_lat: lat,
      location_lng: lng,
      location_name,
      description,
      thumbnail_url,
      media_url,
      dates,
      time_of_day,
    });
  }

  return { kind: "activities", items };
}

export type MapCameraConfig =
  | {
      mode: "bounds";
      ne: [number, number];
      sw: [number, number];
    }
  | {
      mode: "center";
      coordinate: [number, number];
      zoomLevel: number;
    };

const SINGLE_PIN_ZOOM = 13;
const BOUNDS_LAT_PADDING = 0.02;
const BOUNDS_LNG_PADDING = 0.02;

export function computeMapCameraForActivities(
  items: MapViewActivityForMap[],
): MapCameraConfig | null {
  if (items.length === 0) return null;

  const coords: [number, number][] = items.map((a) => [
    a.location_lng,
    a.location_lat,
  ]);

  if (coords.length === 1) {
    const coordinate = coords[0];
    if (!coordinate) return null;
    return { mode: "center", coordinate, zoomLevel: SINGLE_PIN_ZOOM };
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  if (minLng === maxLng && minLat === maxLat) {
    return {
      mode: "center",
      coordinate: [minLng, minLat],
      zoomLevel: SINGLE_PIN_ZOOM,
    };
  }

  const ne: [number, number] = [
    maxLng + BOUNDS_LNG_PADDING,
    maxLat + BOUNDS_LAT_PADDING,
  ];
  const sw: [number, number] = [
    minLng - BOUNDS_LNG_PADDING,
    minLat - BOUNDS_LAT_PADDING,
  ];

  return { mode: "bounds", ne, sw };
}
