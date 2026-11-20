import { HeroIsland } from "../art/Hero";

export function SetupNeeded() {
  return (
    <div className="welcome">
      <HeroIsland pose="wave" />
      <div className="page narrow">
        <div className="card stack">
          <h2>Almost ready to farm</h2>
          <p>Harvest needs a Supabase project to keep track of farms. To connect one:</p>
          <ol className="setup-steps">
            <li>
              Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.
            </li>
            <li>
              Run <code>supabase/migrations/0001_init.sql</code> in its SQL editor.
            </li>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code> and fill in the project URL and anon key.
            </li>
            <li>Restart <code>npm run dev</code>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
