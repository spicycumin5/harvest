import { sunPosition, sunTimes } from "./sun";

/** Everything the scene needs to paint the sky at one moment. */
export interface SkyState {
  /** Sun's height above the horizon in degrees. */
  altitude: number;
  /** Sun's direction in degrees from south, west positive. */
  azimuth: number;
  /** The highest the sun gets today, in degrees (used to scale its arc across the scene). */
  peak: number;
  /** 0 in full daylight, 1 in full night. */
  dark: number;
  /** Sky gradient, top to bottom. */
  colors: [string, string, string];
  /** Colour of the sun disc and its halo (warmer near the horizon). */
  sunColor: string;
  sunrise: Date | null;
  sunset: Date | null;
}

type Palette = [string, string, string];
const NIGHT: Palette = ["#1f2650", "#3c4380", "#7a6ea6"];
const DAWN: Palette = ["#f2b6c6", "#f9d3c8", "#fde8d4"];
const DUSK: Palette = ["#a28fd0", "#e8a6bb", "#f8c8a6"];
const DAY: Palette = ["#9cd1e2", "#cfe8ea", "#fbe4d8"];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return "#" + [m(16), m(8), m(0)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

const mixPalette = (a: Palette, b: Palette, t: number): Palette => [mixHex(a[0], b[0], t), mixHex(a[1], b[1], t), mixHex(a[2], b[2], t)];

/**
 * Colours for a given sun altitude. Twilight uses the dawn palette before solar noon
 * and the dusk palette after, so mornings and evenings feel different.
 */
export function skyColors(altitude: number, morning: boolean): Palette {
  const twilight = morning ? DAWN : DUSK;
  if (altitude >= 14) return DAY;
  if (altitude >= 4) return mixPalette(twilight, DAY, (altitude - 4) / 10);
  if (altitude >= -4) return twilight;
  if (altitude >= -12) return mixPalette(NIGHT, twilight, (altitude + 12) / 8);
  return NIGHT;
}

export function skyAt(date: Date, loc: SkyLocation): SkyState {
  const { altitude, azimuth } = sunPosition(date, loc.lat, loc.lng);
  // azimuth < 0 means the sun is still in the eastern half of the sky
  const morning = azimuth < 0;
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const { sunrise, sunset } = sunTimes(dayStart, loc.lat, loc.lng);
  let peak = -90;
  for (let m = 0; m < 24 * 60; m += 20) {
    peak = Math.max(peak, sunPosition(new Date(dayStart.valueOf() + m * 60_000), loc.lat, loc.lng).altitude);
  }
  return {
    altitude,
    azimuth,
    peak,
    dark: clamp01((2 - altitude) / 10),
    colors: skyColors(altitude, morning),
    sunColor: mixHex("#ffc896", "#fff3d6", clamp01(altitude / 20)),
    sunrise,
    sunset,
  };
}

// ── location ────────────────────────────────────────────────────────────────

export interface SkyLocation {
  lat: number;
  lng: number;
  /** "device": from the browser's location; "timezone": a rough guess from the time zone. */
  source: "device" | "timezone";
}

const STORAGE_KEY = "harvest.location";

/**
 * A rough position from the time zone alone, so the sky is roughly right without
 * asking for location. Longitude comes from the standard (non-DST) UTC offset; latitude
 * from a coarse guess by region.
 */
export function guessLocation(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"): SkyLocation {
  const year = new Date().getFullYear();
  const standardOffsetMin = Math.max(new Date(year, 0, 1).getTimezoneOffset(), new Date(year, 6, 1).getTimezoneOffset());
  const lng = Math.max(-180, Math.min(180, -standardOffsetMin / 4));
  return { lat: guessLatitude(timeZone), lng, source: "timezone" };
}

const SOUTHERN_AMERICAS = /Sao_Paulo|Argentina|Buenos_Aires|Santiago|Lima|Montevideo|Asuncion|La_Paz|Bogota|Guayaquil/;

function guessLatitude(tz: string): number {
  if (tz.startsWith("America/")) return SOUTHERN_AMERICAS.test(tz) ? -20 : 38;
  if (tz.startsWith("Europe/")) return 50;
  if (tz.startsWith("Africa/")) return /Johannesburg|Maputo|Harare|Windhoek/.test(tz) ? -26 : 8;
  if (tz.startsWith("Australia/")) return -33;
  if (tz.startsWith("Pacific/")) return /Auckland|Chatham/.test(tz) ? -40 : /Honolulu/.test(tz) ? 21 : 0;
  if (tz.startsWith("Asia/")) return /Jakarta|Makassar|Jayapura/.test(tz) ? -6 : /Singapore|Kuala_Lumpur/.test(tz) ? 2 : 32;
  return 35;
}

export function loadSavedLocation(): SkyLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SkyLocation;
    return Number.isFinite(v.lat) && Number.isFinite(v.lng) ? { ...v, source: "device" } : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function subscribeLocation(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Saves a device location, rounded to ~11 km. It never leaves the browser. */
export function saveLocation(lat: number, lng: number) {
  const round = (v: number) => Math.round(v * 10) / 10;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: round(lat), lng: round(lng), source: "device" }));
  } catch {
    // storage unavailable: the time zone guess keeps working
  }
  listeners.forEach((f) => f());
}

export function forgetLocation() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((f) => f());
}

export function currentLocation(): SkyLocation {
  return loadSavedLocation() ?? guessLocation();
}
