import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useProfile, useUpdateProfile } from "../data/hooks";
import { browserTimeZone } from "../lib/dates";
import { ErrorNote, Loading } from "../components/ui";

export function Settings() {
  const profile = useProfile();
  if (!profile.data) return <Loading />;
  return <SettingsForm key={profile.data.id} initial={profile.data} />;
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
    <div className="page narrow">
      <h1>Settings</h1>
      <form className="card stack" onSubmit={save}>
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

      <div className="card stack" style={{ marginTop: 20 }}>
        <h3>Leave the farm</h3>
        <p className="muted">Your farm stays just as it is until you come back.</p>
        <div>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
