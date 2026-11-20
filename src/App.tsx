import { NavLink, Navigate, Route, Routes, Link } from "react-router-dom";
import { useSession } from "./data/session";
import { useProfile } from "./data/hooks";
import { supabaseConfigured } from "./lib/supabase";
import { SvgDefs, phaseForHour } from "./art/Island";
import { ErrorNote, Loading } from "./components/ui";
import { Welcome } from "./screens/Welcome";
import { Onboarding } from "./screens/Onboarding";
import { Field } from "./screens/Field";
import { Habits } from "./screens/Habits";
import { Almanac } from "./screens/Almanac";
import { Settings } from "./screens/Settings";
import { SetupNeeded } from "./screens/SetupNeeded";

export function App() {
  return (
    <>
      <SvgDefs />
      <Gate />
    </>
  );
}

function Gate() {
  const { session, loading } = useSession();
  if (!supabaseConfigured) return <SetupNeeded />;
  if (loading) return <Loading />;
  if (!session) return <Welcome />;
  return <SignedIn />;
}

function SignedIn() {
  const profile = useProfile();
  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <div className="page">
        <ErrorNote error={profile.error ?? "Couldn't find your farm."} />
      </div>
    );
  if (!profile.data.farm_name) return <Onboarding />;

  return (
    <>
      <header className={"topbar" + (phaseForHour(new Date().getHours()) === "night" ? " on-dark" : "")}>
        <Link to="/" className="brand">
          {profile.data.farm_name}
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Field
          </NavLink>
          <NavLink to="/habits">Habits</NavLink>
          <NavLink to="/almanac">Almanac</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Field />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/almanac" element={<Almanac />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
