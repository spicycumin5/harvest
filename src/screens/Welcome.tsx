import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { browserTimeZone } from "../lib/dates";
import { HeroIsland } from "../art/Hero";

export function Welcome() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, data: { timezone: browserTimeZone() } },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else setStatus("sent");
  }

  return (
    <div className="welcome">
      <HeroIsland pose="wave" />

      <div className="page narrow">
        <div className="card stack welcome-card">
          <h1 className="center">Grow your habits, one little row at a time</h1>
          <p className="center muted">
            Every habit is a plot on a small floating island. Show up each day and the wanderer who lives there plants,
            waters and weeds. Keep it up and you'll have a harvest.
          </p>

          {status === "sent" ? (
            <div className="sent-note">
              <h3>Check your inbox 💌</h3>
              <p>
                We sent a sign-in link to <strong>{email}</strong>. Open it on this device to walk onto your farm.
              </p>
              <button className="btn ghost small" onClick={() => setStatus("idle")}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="stack">
              <div className="field">
                <label htmlFor="email">Your email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send me a magic link"}
              </button>
              {error && <p className="error">{error}</p>}
              <p className="muted small center">No password needed. New here? The link creates your farm.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
