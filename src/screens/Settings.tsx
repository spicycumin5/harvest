import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useProfile, useUpdateProfile } from "../data/hooks";
import { browserTimeZone } from "../lib/dates";
import { ErrorNote, Loading } from "../components/ui";
import { IslandScene, type IslandPlot } from "../art/Island";
import { THEMES, THEME_IDS } from "../art/scene/themes";
import type { ThemeId } from "../data/types";
import type { PlotState } from "../game/engine";
import { forgetLocation, saveLocation } from "../lib/sky";
import { useSky, useSkyLocation } from "../data/useSky";

const timeFmt = (d: Date | null) => (d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null);

/** Lets the sky follow the real sun where the user actually is. */
function DaylightCard() {
  const loc = useSkyLocation();
  const sky = useSky();
  const [status, setStatus] = useState<"idle" | "asking" | "denied" | "unavailable">("idle");

  function requestDeviceLocation() {
    if (!("geolocation" in navigator)) return setStatus("unavailable");
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation(pos.coords.latitude, pos.coords.longitude);
        setStatus("idle");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, maximumAge: 24 * 3600_000, timeout: 15_000 },
    );
  }

  const rise = timeFmt(sky.sunrise);
  const set = timeFmt(sky.sunset);

  return (
    <div className="panel-section stack">
      <h3>Sunrise &amp; sunset</h3>
      <p className="muted" style={{ margin: 0 }}>
        The island's sky follows the real sun: dawn, golden hour, dusk and night arrive when they do outside your window.
      </p>
      <p style={{ margin: 0 }}>
        {rise && set ? (
          <>
            Today: sunrise <strong>{rise}</strong>, sunset <strong>{set}</strong>
          </>
        ) : sky.altitude > 0 ? (
          "The sun doesn't set today where you are."
        ) : (
          "The sun doesn't rise today where you are."
        )}
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        {loc.source === "device"
          ? "Using your device's location, rounded to about 11 km. It's stored only in this browser and never sent to the server."
          : "Using a rough estimate from your time zone. For accurate times, use your device's location (stored only in this browser, rounded to about 11 km)."}
      </p>
      {status === "denied" && <p className="error small" style={{ margin: 0 }}>Location permission was declined, so the time zone estimate stays in use.</p>}
      {status === "unavailable" && <p className="error small" style={{ margin: 0 }}>Couldn't get a location from this device.</p>}
      <div className="row">
        {loc.source === "device" ? (
          <>
            <button type="button" className="btn ghost small" onClick={requestDeviceLocation} disabled={status === "asking"}>
              Update location
            </button>
            <button type="button" className="btn ghost small" onClick={forgetLocation}>
              Use time zone instead
            </button>
          </>
        ) : (
          <button type="button" className="btn sage small" onClick={requestDeviceLocation} disabled={status === "asking"}>
            {status === "asking" ? "Finding you…" : "Use my location"}
          </button>
        )}
      </div>
    </div>
  );
}


/** Pick which land the farm sits on. Each option is a live miniature. */
export function ThemePicker({ value, onChange, disabled }: { value: ThemeId; onChange: (t: ThemeId) => void; disabled?: boolean }) {
  const sky = useSky();
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Land">
      {THEME_IDS.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          disabled={disabled}
          className={`theme-option${value === t ? " selected" : ""}`}
          onClick={() => onChange(t)}
        >
          <span className="theme-preview" aria-hidden="true">
            <IslandScene sky={sky} theme={t} plots={PREVIEW_PLOTS} />
          </span>
          <span className="theme-name">{THEMES[t].name}</span>
          <span className="theme-blurb">{THEMES[t].blurb}</span>
        </button>
      ))}
    </div>
  );
}

const previewState: PlotState = {
  status: "growing",
  stage: "bloom",
  growth: 15,
  hearts: 3,
  weeds: 0,
  doneToday: false,
  restToday: false,
  nextAction: "water",
  diedOn: null,
  daysToRipe: 5,
};
const PREVIEW_PLOTS: IslandPlot[] = [
  { index: 0, name: "", crop: "sunflower", state: { ...previewState, stage: "ripe", status: "ripe" } },
  { index: 4, name: "", crop: "lavender", state: previewState },
  { index: 5, name: "", crop: "carrot", state: { ...previewState, stage: "plowed" } },
];

function ThemeCard({ current }: { current: ThemeId }) {
  const update = useUpdateProfile();
  return (
    <section className="panel-section stack">
      <h3>Your land</h3>
      <ThemePicker value={current} onChange={(theme) => update.mutate({ theme })} disabled={update.isPending} />
      <ErrorNote error={update.error} />
    </section>
  );
}

export function SettingsPanel() {
  const profile = useProfile();
  if (!profile.data) return <Loading />;
  return (
    <div className="stack panel-stack">
      <ThemeCard current={profile.data.theme ?? "floating"} />
      <SettingsForm key={profile.data.id} initial={profile.data} />
    </div>
  );
}

function SettingsForm({ initial }: { initial: { farm_name: string | null; display_name: string | null; timezone: string } }) {
  const update = useUpdateProfile();
  const [farm, setFarm] = useState(initial.farm_name ?? "");
  const [name, setName] = useState(initial.display_name ?? "");
  const [tz, setTz] = useState(initial.timezone);
  const [saved, setSaved] = useState(false);

  const zones = useMemo(() => {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    return all.includes(tz) ? all : [tz, ...all];
  }, [tz]);

  function save(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    update.mutate(
      { farm_name: farm.trim() || initial.farm_name, display_name: name.trim() || null, timezone: tz },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <>
      <form className="panel-section stack" onSubmit={save}>
        <h3>Your farm</h3>
        <div className="field">
          <label htmlFor="farm">Farm name</label>
          <input id="farm" className="input" maxLength={40} value={farm} onChange={(e) => setFarm(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tz">Time zone</label>
          <select id="tz" className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <span className="small muted">
            Your day rolls over at midnight here.{" "}
            {tz !== browserTimeZone() && (
              <button type="button" className="link-btn" onClick={() => setTz(browserTimeZone())}>
                Use this device's ({browserTimeZone()})
              </button>
            )}
          </span>
        </div>
        <ErrorNote error={update.error} />
        <div className="row">
          <button className="btn sage" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </button>
          {saved && <span className="muted">Saved 🌼</span>}
        </div>
      </form>

      <DaylightCard />

      <div className="panel-section stack">
        <h3>Leave the farm</h3>
        <p className="muted">Your farm stays just as it is until you come back.</p>
        <div>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
