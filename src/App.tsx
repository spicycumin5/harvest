import { NavLink, Route, Routes, Link } from "react-router-dom";
import { useSession } from "./data/session";
import { useProfile } from "./data/hooks";
import { supabaseConfigured } from "./lib/supabase";
import { SvgDefs } from "./art/Island";
import { useSky } from "./data/useSky";
import { ErrorNote, Loading } from "./components/ui";
import { Welcome } from "./screens/Welcome";
import { Onboarding } from "./screens/Onboarding";
import { Field } from "./screens/Field";
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
  const sky = useSky();
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
      <header className={"topbar" + (sky.dark > 0.5 ? " on-dark" : "")}>
        <Link to="/" className="brand">
          {profile.data.farm_name}
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Farm
          </NavLink>
          <NavLink to="/habits">Habits</NavLink>
          <NavLink to="/almanac">Almanac</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <Routes>
        {/* One farm stays mounted for every path; /habits, /almanac and /settings open panels over it. */}
        <Route path="*" element={<Field />} />
      </Routes>
    </>
  );
}
