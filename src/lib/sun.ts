/**
 * Where the sun is in the sky, from standard low-precision astronomical formulas
 * (accurate to a minute or two, which is plenty for painting a sky).
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

/** Days since the J2000 epoch. */
function daysSinceJ2000(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
}

function sunEquatorial(d: number): { dec: number; ra: number } {
  const M = RAD * (357.5291 + 0.98560028 * d); // mean anomaly
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)); // equation of centre
  const L = M + C + RAD * 102.9372 + Math.PI; // ecliptic longitude
  return {
    dec: Math.asin(Math.sin(OBLIQUITY) * Math.sin(L)),
    ra: Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L)),
  };
}

export interface SunPosition {
  /** Degrees above the horizon (negative below). */
  altitude: number;
  /** Degrees from south, positive toward the west (so east is −90, west is +90). */
  azimuth: number;
}

export function sunPosition(date: Date, lat: number, lng: number): SunPosition {
  const d = daysSinceJ2000(date);
  const { dec, ra } = sunEquatorial(d);
  const phi = RAD * lat;
  const siderealTime = RAD * (280.16 + 360.9856235 * d) + RAD * lng;
  const H = siderealTime - ra; // hour angle
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { altitude: altitude / RAD, azimuth: azimuth / RAD };
}

/** The sun's upper edge touches the horizon, allowing for refraction. */
const HORIZON = -0.833;

export interface SunTimes {
  sunrise: Date | null; // null during polar night or midnight sun
  sunset: Date | null;
}

/**
 * Sunrise and sunset within the 24 hours starting at `dayStart`, found by stepping
 * through the day and refining each horizon crossing.
 */
export function sunTimes(dayStart: Date, lat: number, lng: number): SunTimes {
  const STEP = 10 * 60_000;
  const alt = (t: number) => sunPosition(new Date(t), lat, lng).altitude - HORIZON;
  const refine = (a: number, b: number) => {
    for (let i = 0; i < 20; i++) {
      const m = (a + b) / 2;
      if (Math.sign(alt(m)) === Math.sign(alt(a))) a = m;
      else b = m;
    }
    return new Date((a + b) / 2);
  };
  let sunrise: Date | null = null;
  let sunset: Date | null = null;
  const start = dayStart.valueOf();
  let prev = alt(start);
  for (let t = start + STEP; t <= start + DAY_MS; t += STEP) {
    const cur = alt(t);
    if (prev < 0 && cur >= 0 && !sunrise) sunrise = refine(t - STEP, t);
    if (prev >= 0 && cur < 0 && !sunset) sunset = refine(t - STEP, t);
    prev = cur;
  }
  return { sunrise, sunset };
}
