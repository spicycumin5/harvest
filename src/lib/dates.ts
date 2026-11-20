/** A local calendar day, formatted YYYY-MM-DD. */
export type Day = string;

const DAY_MS = 86_400_000;

function toUTC(day: Day): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): Day {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: Day, n: number): Day {
  return fromUTC(toUTC(day) + n * DAY_MS);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: Day, b: Day): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** Today's date in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): Day {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(now);
  }
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/**
 * Dev-only time travel: `?today=YYYY-MM-DD` in the URL overrides today.
 * Ignored in production builds.
 */
export function devTodayOverride(): Day | null {
  if (!import.meta.env?.DEV || typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("today");
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function dayRange(from: Day, to: Day): Day[] {
  const out: Day[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function formatDay(day: Day, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return new Date(toUTC(day)).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
}
