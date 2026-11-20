import { useEffect, useMemo, useState } from "react";
import { currentLocation, skyAt, subscribeLocation, type SkyLocation, type SkyState } from "../lib/sky";

/**
 * Dev-only: `?hour=18.5` shows the sky at that local time today, so the whole
 * daylight cycle can be checked without waiting for it.
 */
function devNow(): Date {
  const now = new Date();
  if (!import.meta.env?.DEV || typeof window === "undefined") return now;
  const h = Number(new URLSearchParams(window.location.search).get("hour"));
  if (!Number.isFinite(h) || h < 0 || h >= 24 || new URLSearchParams(window.location.search).get("hour") === null) return now;
  const d = new Date(now);
  d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
  return d;
}

export function useSkyLocation(): SkyLocation {
  const [loc, setLoc] = useState(currentLocation);
  useEffect(() => subscribeLocation(() => setLoc(currentLocation())), []);
  return loc;
}

/** The real sky over the user right now, refreshed every minute. */
export function useSky(): SkyState {
  const loc = useSkyLocation();
  const [now, setNow] = useState(devNow);
  useEffect(() => {
    const t = setInterval(() => setNow(devNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => skyAt(now, loc), [now, loc]);
}
