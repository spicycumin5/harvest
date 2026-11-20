import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useCompletions, useHabits, useHarvest, useProfile, useReplant, useSetCompletion, useToday } from "../data/hooks";
import type { Completion, Habit, ThemeId } from "../data/types";
import { addDays, formatDay, type Day } from "../lib/dates";
import { canRest, computePlot, isEditableDay, streaks, type PlotState, type TendAction } from "../game/engine";
import { CROPS, STAGE_LABEL } from "../game/crops";
import { HOME, IslandScene, routeTo, walkSeconds, type EffectAction, type FarmerMotion } from "../art/Island";
import { CropIcon } from "../art/Crop";
import { Hearts, PlotScene } from "../art/Plot";
import { useSky } from "../data/useSky";
import type { SkyState } from "../lib/sky";
import { useMediaQuery } from "../lib/useMediaQuery";
import { ErrorNote, Loading, Modal, SidePanel, Toast } from "../components/ui";
import { HabitsPanel } from "./Habits";
import { AlmanacPanel } from "./Almanac";
import { SettingsPanel } from "./Settings";

type Job = EffectAction;
type SheetAction = Job | "rest" | "undo" | "yesterday";

const PANELS: Record<string, { title: string; Body: () => ReactNode }> = {
  "/habits": { title: "Habits", Body: HabitsPanel },
  "/almanac": { title: "Almanac", Body: AlmanacPanel },
  "/settings": { title: "Settings", Body: SettingsPanel },
};

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const JOB_TOAST: Record<Job, (produce: string, crop: string) => string> = {
  plow: () => "Day one: the field is plowed",
  plant: (_p, c) => `${c} seeds are in the ground`,
  water: () => "Watered. The soil drinks it up",
  weed: () => "Weeds pulled. Breathing room again",
  harvest: (p) => `A harvest! ${p} added to your pantry`,
  replant: (_p, c) => `Cleared. Plow the bed to start a new ${c.toLowerCase()} crop`,
};

const JOB_LABEL: Record<Job, string> = {
  plow: "Plow the field",
  plant: "Plant the seeds",
  water: "Water the crop",
  weed: "Pull the weeds",
  harvest: "Harvest",
  replant: "Clear and replant",
};

/** "Sunset 4:52 PM" while the sun is up, "Sunrise 7:10 AM" before dawn. */
function nextSunEvent(sky: SkyState): string | null {
  const now = Date.now();
  const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sky.sunrise && now < sky.sunrise.valueOf()) return `Sunrise ${fmt(sky.sunrise)}`;
  if (sky.sunset && now < sky.sunset.valueOf()) return `Sunset ${fmt(sky.sunset)}`;
  return null;
}

/** The one-tap job for a plot right now, if there is one. */
function quickJob(s: PlotState): Job | null {
  if (s.status === "dead") return "replant";
  if (s.status === "ripe") return "harvest";
  if (s.status === "fallow" || s.doneToday || s.restToday) return null;
  return s.nextAction === "none" ? null : (s.nextAction as TendAction);
}

function statusLine(s: PlotState): string {
  if (s.status === "dead") return "Wilted";
  if (s.status === "fallow") return "Resting soil";
  if (s.status === "ripe") return "Ripe!";
  if (s.restToday) return "Resting today";
  if (s.doneToday) return `Tended · ${STAGE_LABEL[s.stage].toLowerCase()}`;
  return STAGE_LABEL[s.stage];
}

function useHeight<T extends HTMLElement>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [h, setH] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, h];
}

export function Field() {
  const profile = useProfile();
  const habits = useHabits();
  const completions = useCompletions();
  const today = useToday();
  const setCompletion = useSetCompletion();
  const harvest = useHarvest();
  const replant = useReplant();
  const navigate = useNavigate();
  const location = useLocation();
  const sky = useSky();
  const phone = useMediaQuery("(max-width: 640px)");
  const narrow = useMediaQuery("(max-width: 900px)");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [farmer, setFarmer] = useState<FarmerMotion>({ pose: "idle", path: [HOME], key: 0 });
  const [effect, setEffect] = useState<{ index: number; action: Job; key: number } | null>(null);
  // While the farmer walks over, the plot keeps its old look; it changes when the job is done.
  const [frozen, setFrozen] = useState<Map<number, PlotState>>(new Map());
  const timers = useRef<number[]>([]);
  const [dockRef, dockH] = useHeight<HTMLDivElement>(80);

  const panel = PANELS[location.pathname];
  const theme: ThemeId = profile.data?.theme ?? "floating";

  const byHabit = useMemo(() => {
    const m = new Map<string, Completion[]>();
    for (const c of completions.data ?? []) {
      const list = m.get(c.habit_id) ?? [];
      list.push(c);
      m.set(c.habit_id, list);
    }
    return m;
  }, [completions.data]);

  const plots = useMemo(
    () =>
      (habits.data ?? [])
        .map((h) => ({ habit: h, state: computePlot(h, byHabit.get(h.id) ?? [], today) }))
        .sort((a, b) => a.habit.plot_index - b.habit.plot_index),
    [habits.data, byHabit, today],
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  /** Walk to the plot, do the job (with its effect on the soil), wave, and head home. */
  const sendFarmer = useCallback((index: number, job: Job, before: PlotState) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFrozen(new Map([[index, before]]));
    const route = routeTo(index);
    const stand = route[route.length - 1];
    const walkMs = walkSeconds(route) * 1000;
    let key = Date.now();
    const go = (m: Omit<FarmerMotion, "key">) => setFarmer({ ...m, key: ++key });
    const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
    const pose = job === "replant" ? "plow" : job;
    go({ pose: "walk", path: route });
    later(walkMs, () => {
      go({ pose, path: [stand] });
      setEffect({ index, action: job, key });
      setFrozen(new Map());
    });
    later(walkMs + 2400, () => go({ pose: "wave", path: [stand] }));
    later(walkMs + 3200, () => {
      setEffect(null);
      go({ pose: "walk", path: [...route].reverse() });
    });
    later(walkMs * 2 + 3200, () => go({ pose: "idle", path: [HOME] }));
  }, []);

  if (habits.isLoading || completions.isLoading || profile.isLoading) return <Loading />;
  if (location.pathname !== "/" && !panel) return <Navigate to="/" replace />;

  const hour = new Date().getHours();
  const name = profile.data?.display_name;
  const tended = plots.filter((p) => p.state.doneToday || p.state.restToday).length;
  const active = plots.filter((p) => p.state.status !== "fallow").length;
  const selected = plots.find((p) => p.habit.id === selectedId) ?? null;
  const dark = sky.dark > 0.5;
  const sun = nextSunEvent(sky);

  function act(habit: Habit, state: PlotState, action: SheetAction) {
    setSelectedId(null);
    const crop = CROPS[habit.crop_type];
    switch (action) {
      case "rest":
        setCompletion.mutate({ habitId: habit.id, day: today, kind: "rest" });
        setToast("Tucked in for a rest day. No hearts lost.");
        return;
      case "undo":
        setCompletion.mutate({ habitId: habit.id, day: today, kind: null });
        return;
      case "yesterday":
        setCompletion.mutate({ habitId: habit.id, day: addDays(today, -1), kind: "done" });
        setToast("Yesterday's work is recorded");
        return;
      case "harvest":
        harvest.mutate({ habitId: habit.id, today });
        break;
      case "replant":
        replant.mutate({ habitId: habit.id, diedOn: state.diedOn!, today });
        break;
      default:
        setCompletion.mutate({ habitId: habit.id, day: today, kind: "done" });
    }
    setToast(JOB_TOAST[action](crop.produce, crop.label));
    sendFarmer(habit.plot_index, action, state);
  }

  const closePanel = () => navigate("/");
  const panelW = Math.min(460, typeof window !== "undefined" ? window.innerWidth * 0.46 : 460);
  const insets = phone
    ? { top: 118, bottom: panel ? Math.round(window.innerHeight * 0.7) : dockH + 84, right: 0 }
    : { top: narrow ? 128 : 72, bottom: dockH + 20, right: panel ? panelW + 24 : 0 };

  return (
    <div className={`farm-view${panel ? " has-panel" : ""}`}>
      <div className="farm-stage">
        <IslandScene
          sky={sky}
          theme={theme}
          plots={plots.map((p) => ({ index: p.habit.plot_index, name: p.habit.name, crop: p.habit.crop_type, state: frozen.get(p.habit.plot_index) ?? p.state }))}
          farmer={farmer}
          effect={effect ?? undefined}
          showEmpty
          showLabels={!phone}
          selected={selected?.habit.plot_index ?? null}
          onSelectPlot={(i) => setSelectedId(plots.find((p) => p.habit.plot_index === i)?.habit.id ?? null)}
          onSelectEmpty={() => navigate("/habits")}
          insetTop={insets.top}
          insetBottom={insets.bottom}
          insetRight={insets.right}
        />
      </div>

      <div className={`field-hud${dark ? " on-dark" : ""}`}>
        <h1>
          {greeting(hour)}
          {name ? `, ${name}` : ""}
        </h1>
        <p>
          {formatDay(today, narrow ? { weekday: "short", month: "short", day: "numeric" } : { weekday: "long", month: "long", day: "numeric" })}
          {sun && <span className="hud-sun"> · {sun}</span>}
          <br />
          {active === 0 ? "The fields are quiet" : tended === active ? "Every plot tended today" : `${tended} of ${active} plots tended today`}
        </p>
      </div>

      <ErrorNote error={habits.error ?? completions.error ?? setCompletion.error ?? harvest.error ?? replant.error} />

      <div className="habit-dock" ref={dockRef} aria-label="Today's habits">
        {plots.length === 0 ? (
          <button className="dock-item dock-empty" onClick={() => navigate("/habits")}>
            <span className="dock-text">
              <span className="dock-name">Plant your first habit</span>
              <span className="dock-status">Every habit gets its own plot</span>
            </span>
            <span className="dock-action">+</span>
          </button>
        ) : (
          plots.map(({ habit, state }) => {
            const job = quickJob(state);
            const done = state.doneToday || state.restToday;
            return (
              <div key={habit.id} className={`dock-item status-${state.status}${done ? " is-done" : ""}${selectedId === habit.id ? " is-selected" : ""}`}>
                <button className="dock-main" onClick={() => setSelectedId(habit.id)} aria-label={`${habit.name}: ${statusLine(state)}. Open details`}>
                  <span className="dock-icon" aria-hidden="true">
                    <CropIcon type={habit.crop_type} stage={state.stage === "bare" || state.stage === "plowed" ? "sprout" : state.stage} size={34} />
                  </span>
                  <span className="dock-text">
                    <span className="dock-name">{habit.name}</span>
                    <span className="dock-status">
                      {state.status === "growing" && !done ? <Hearts count={state.hearts} /> : null}
                      <span>{statusLine(state)}</span>
                    </span>
                  </span>
                </button>
                <button
                  className={`dock-action${job ? "" : " idle"}`}
                  disabled={!job}
                  onClick={() => job && act(habit, state, job)}
                  aria-label={job ? `${JOB_LABEL[job]}: ${habit.name}` : done ? "Done for today" : "Nothing to do today"}
                  title={job ? JOB_LABEL[job] : done ? "Done for today" : "Resting"}
                >
                  <JobIcon job={job ?? (done ? "done" : "rest")} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {panel && (
          <SidePanel key={location.pathname} title={panel.title} onClose={closePanel}>
            <panel.Body />
          </SidePanel>
        )}
      </AnimatePresence>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} label={selected?.habit.name ?? "Plot"}>
        {selected && (
          <PlotSheet
            habit={selected.habit}
            state={selected.state}
            theme={theme}
            completions={byHabit.get(selected.habit.id) ?? []}
            today={today}
            onAct={(a) => act(selected.habit, selected.state, a)}
          />
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

/** Small pictograms for each job. */
function JobIcon({ job }: { job: Job | "done" | "rest" }) {
  const common = { width: 20, height: 20, viewBox: "0 0 20 20", "aria-hidden": true } as const;
  switch (job) {
    case "plow":
      return (
        <svg {...common}>
          <path d="M4 16 L14 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 3 L17 6 L15 8 Z" fill="currentColor" />
        </svg>
      );
    case "plant":
      return (
        <svg {...common}>
          <ellipse cx="10" cy="12" rx="3.2" ry="4.4" fill="currentColor" />
          <path d="M10 8 Q10 3 14 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "water":
      return (
        <svg {...common}>
          <path d="M10 3 Q15 10 15 12.5 A5 5 0 0 1 5 12.5 Q5 10 10 3 Z" fill="currentColor" />
        </svg>
      );
    case "weed":
      return (
        <svg {...common}>
          <path d="M10 17 V9 M10 11 Q5 10 4 5 Q9 6 10 11 M10 9 Q15 8 16 3 Q11 4 10 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "harvest":
      return (
        <svg {...common}>
          <path d="M3 9 H17 L15 16 H5 Z" fill="currentColor" />
          <path d="M6 9 Q10 3 14 9" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
      );
    case "replant":
      return (
        <svg {...common}>
          <path d="M10 17 V10 M10 12 Q5 11 5 6 Q10 7 10 12 M10 10 Q15 9 15 4 Q10 5 10 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <path d="M4.5 10.5 L8.5 14 L15.5 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M13 3 A7 7 0 1 0 17 13 A5.5 5.5 0 1 1 13 3 Z" fill="currentColor" />
        </svg>
      );
  }
}

function PlotSheet({
  habit,
  state,
  theme,
  completions,
  today,
  onAct,
}: {
  habit: Habit;
  state: PlotState;
  theme: ThemeId;
  completions: Completion[];
  today: Day;
  onAct: (a: SheetAction) => void;
}) {
  const crop = CROPS[habit.crop_type];
  const yesterday = addDays(today, -1);
  const { current, best } = streaks(completions, today);
  const yesterdayOpen = isEditableDay(yesterday, today, habit.cycle_started_on) && !completions.some((c) => c.day === yesterday);
  const restAllowed = canRest(completions, today);
  const job = quickJob(state);

  let mood: string;
  if (state.status === "dead") mood = `Your ${crop.label.toLowerCase()} wilted on ${formatDay(state.diedOn!)}. Every gardener loses a crop sometimes. Clear the plot and start again: plow, plant, water.`;
  else if (state.status === "fallow") mood = "Freshly harvested soil, resting until tomorrow. Then it's back to plowing.";
  else if (state.status === "ripe") mood = `Your ${crop.produce.toLowerCase()} are ripe and ready to pick!`;
  else if (state.doneToday) mood = "All tended for today. Lovely work.";
  else if (state.restToday) mood = "Tucked in under straw for a rest day.";
  else if (state.stage === "bare") mood = "Hard, untilled ground. The first day of work is plowing it.";
  else if (state.stage === "plowed") mood = "The field is plowed. Show up again to plant the seeds.";
  else if (state.hearts === 1) mood = "Looking very thirsty… it really needs you today.";
  else if (state.weeds > 0) mood = "A few weeds have crept in. Show up today to clear them.";
  else mood = `${state.daysToRipe} more ${state.daysToRipe === 1 ? "day" : "days"} of watering until harvest.`;

  return (
    <div className="stack plot-sheet">
      <div>
        <h2>{habit.name}</h2>
        <p className="muted">
          {crop.label} · {state.status === "dead" ? "Wilted" : state.status === "fallow" ? "Resting soil" : STAGE_LABEL[state.stage]}
        </p>
      </div>
      <div className="sheet-scene">
        <PlotScene crop={habit.crop_type} state={state} theme={theme} />
      </div>
      <p>{mood}</p>
      <div className="growth-track" aria-label={`Growth ${state.growth} of ${crop.thresholds.ripe} days`}>
        <span style={{ width: `${Math.round((state.growth / crop.thresholds.ripe) * 100)}%` }} />
      </div>
      <div className="sheet-stats">
        <div>
          <span className="stat-label">Health</span>
          <Hearts count={state.hearts} />
        </div>
        <div>
          <span className="stat-label">Streak</span>
          <strong>{current}</strong>
        </div>
        <div>
          <span className="stat-label">Best</span>
          <strong>{best}</strong>
        </div>
        <div>
          <span className="stat-label">Growth</span>
          <strong>
            {state.growth}/{crop.thresholds.ripe}
          </strong>
        </div>
      </div>

      <div className="sheet-actions">
        {job && (
          <button className={`btn${job === "replant" ? " sage" : ""}`} onClick={() => onAct(job)}>
            {job === "harvest" || job === "replant" ? JOB_LABEL[job] : `I did it today · ${JOB_LABEL[job]}`}
          </button>
        )}
        {state.status === "ripe" && !state.doneToday && (
          <button className="btn ghost small" onClick={() => onAct("water")}>
            I did it today (keep it watered)
          </button>
        )}
        {(state.doneToday || state.restToday) && (
          <button className="btn ghost small" onClick={() => onAct("undo")}>
            Undo today
          </button>
        )}
        {state.status === "growing" && !state.doneToday && !state.restToday && state.stage !== "bare" && (
          <button className="btn ghost small" disabled={!restAllowed} onClick={() => onAct("rest")} title={restAllowed ? "" : "One rest day per week"}>
            {restAllowed ? "Take a rest day" : "Rest day used this week"}
          </button>
        )}
        {yesterdayOpen && state.status !== "fallow" && (
          <button className="btn ghost small" onClick={() => onAct("yesterday")}>
            I did it yesterday
          </button>
        )}
      </div>
    </div>
  );
}
