import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompletions, useHabits, useHarvest, useProfile, useReplant, useSetCompletion, useToday } from "../data/hooks";
import type { Completion, Habit } from "../data/types";
import { addDays, formatDay, type Day } from "../lib/dates";
import { canRest, computePlot, isEditableDay, streaks, type FarmerAction, type PlotState } from "../game/engine";
import { CROPS, STAGE_LABEL } from "../game/crops";
import { HOME, IslandScene, phaseForHour, routeTo, walkSeconds, type FarmerMotion } from "../art/Island";
import { Hearts, PlotScene } from "../art/Plot";
import { ErrorNote, Loading, Modal, Toast } from "../components/ui";

type Tending = Exclude<FarmerAction, "none">;

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const DONE_TOAST: Record<Tending, (crop: string) => string> = {
  plant: (c) => `Seeds are in the ground. Your ${c.toLowerCase()} begin`,
  water: () => "Watered. The soil drinks it up",
  weed: () => "Weeds pulled. Breathing room again",
  harvest: (c) => `A harvest! ${c} added to your pantry`,
  replant: (c) => `Fresh ${c.toLowerCase()} seeds, a fresh start`,
};

function todayLabel(s: PlotState) {
  if (s.status === "dead") return "wilted";
  if (s.status === "ripe") return "ripe";
  if (s.status === "fallow") return "resting soil";
  if (s.doneToday) return "tended";
  if (s.restToday) return "resting";
  return null;
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [farmer, setFarmer] = useState<FarmerMotion>({ pose: "idle", path: [HOME], key: 0 });
  const timers = useRef<number[]>([]);

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

  /** Walk the wanderer along the paths to a plot, do the job, and stroll home. */
  const sendFarmer = useCallback((plotIndex: number, action: Tending) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const route = routeTo(plotIndex);
    const stand = route[route.length - 1];
    const walkMs = walkSeconds(route) * 1000;
    let key = Date.now();
    const go = (m: Omit<FarmerMotion, "key">) => setFarmer({ ...m, key: ++key });
    const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
    go({ pose: "walk", path: route });
    later(walkMs, () => go({ pose: action, path: [stand] }));
    later(walkMs + 2000, () => go({ pose: "wave", path: [stand] }));
    later(walkMs + 2900, () => go({ pose: "walk", path: [...route].reverse() }));
    later(walkMs * 2 + 2900, () => go({ pose: "idle", path: [HOME] }));
  }, []);

  if (habits.isLoading || completions.isLoading || profile.isLoading) return <Loading />;

  const hour = new Date().getHours();
  const phase = phaseForHour(hour);
  const name = profile.data?.display_name;
  const tended = plots.filter((p) => p.state.doneToday || p.state.restToday).length;
  const active = plots.filter((p) => p.state.status !== "fallow").length;
  const selected = plots.find((p) => p.habit.id === selectedId) ?? null;

  function act(habit: Habit, state: PlotState, action: Tending | "rest" | "undo" | "yesterday") {
    setSelectedId(null);
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
    setToast(DONE_TOAST[action](CROPS[habit.crop_type].produce));
    sendFarmer(habit.plot_index, action);
  }

  return (
    <div className="field-screen">
      <div className="field-stage">
        <IslandScene
          phase={phase}
          plots={plots.map((p) => ({ index: p.habit.plot_index, name: p.habit.name, crop: p.habit.crop_type, state: p.state }))}
          farmer={farmer}
          showEmpty
          selected={selected?.habit.plot_index ?? null}
          onSelectPlot={(i) => setSelectedId(plots.find((p) => p.habit.plot_index === i)?.habit.id ?? null)}
          onSelectEmpty={() => navigate("/habits")}
        />
        <div className={`field-hud${phase === "night" ? " on-dark" : ""}`}>
          <h1>
            {greeting(hour)}
            {name ? `, ${name}` : ""}
          </h1>
          <p>
            {formatDay(today, { weekday: "long", month: "long", day: "numeric" })}
            <br />
            {active === 0 ? "The island is quiet" : tended === active ? "Every plot tended today" : `${tended} of ${active} plots tended`}
          </p>
        </div>
      </div>

      <div className="page field-page">
        <ErrorNote error={habits.error ?? completions.error ?? setCompletion.error ?? harvest.error ?? replant.error} />
        {plots.length > 0 && (
          <ul className="today-list" aria-label="Today">
            {plots.map(({ habit, state }) => (
              <li key={habit.id}>
                <button
                  className={`today-item status-${state.status}${state.doneToday || state.restToday ? " is-done" : ""}`}
                  onClick={() => setSelectedId(habit.id)}
                >
                  <span className="today-dot" aria-hidden="true" />
                  <span className="today-name">{habit.name}</span>
                  <span className="today-state">{todayLabel(state) ?? <Hearts count={state.hearts} />}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} label={selected?.habit.name ?? "Plot"}>
        {selected && (
          <PlotSheet
            habit={selected.habit}
            state={selected.state}
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

const ACTION_LABEL: Record<"plant" | "water" | "weed", string> = {
  plant: "Plant the seeds",
  water: "Water the crop",
  weed: "Pull the weeds",
};

function PlotSheet({
  habit,
  state,
  completions,
  today,
  onAct,
}: {
  habit: Habit;
  state: PlotState;
  completions: Completion[];
  today: Day;
  onAct: (a: Tending | "rest" | "undo" | "yesterday") => void;
}) {
  const crop = CROPS[habit.crop_type];
  const yesterday = addDays(today, -1);
  const { current, best } = streaks(completions, today);
  const yesterdayOpen =
    isEditableDay(yesterday, today, habit.cycle_started_on) && !completions.some((c) => c.day === yesterday);
  const restAllowed = canRest(completions, today);

  let mood: string;
  if (state.status === "dead") mood = `Your ${crop.label.toLowerCase()} wilted on ${formatDay(state.diedOn!)}. Every gardener loses a crop sometimes. The soil is ready for another try.`;
  else if (state.status === "fallow") mood = "Freshly harvested soil, resting until tomorrow. New seeds go in then.";
  else if (state.status === "ripe") mood = `Your ${crop.produce.toLowerCase()} are ripe and ready to pick!`;
  else if (state.doneToday) mood = "All tended for today. Lovely work.";
  else if (state.restToday) mood = "Tucked in under straw for a rest day.";
  else if (state.hearts === 1) mood = "Looking very thirsty… it really needs you today.";
  else if (state.weeds > 0) mood = "A few weeds have crept in. Show up today to clear them.";
  else if (state.stage === "bare") mood = "Bare soil, waiting for its first seeds.";
  else mood = `Growing nicely. ${state.daysToRipe} more ${state.daysToRipe === 1 ? "day" : "days"} of care until harvest.`;

  return (
    <div className="stack plot-sheet">
      <div>
        <h2>{habit.name}</h2>
        <p className="muted">
          {crop.label} · {state.status === "dead" ? "Wilted" : state.status === "fallow" ? "Resting soil" : STAGE_LABEL[state.stage]}
        </p>
      </div>
      <div className="sheet-scene">
        <PlotScene crop={habit.crop_type} state={state} />
      </div>
      <p>{mood}</p>
      <div className="sheet-stats">
        <div>
          <span className="stat-label">Health</span>
          <Hearts count={state.hearts} />
        </div>
        <div>
          <span className="stat-label">Streak</span>
          <strong>{current} {current === 1 ? "day" : "days"}</strong>
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
        {state.status === "dead" && (
          <button className="btn sage" onClick={() => onAct("replant")}>
            Replant {crop.label.toLowerCase()} seeds
          </button>
        )}
        {state.status === "ripe" && (
          <button className="btn" onClick={() => onAct("harvest")}>
            Harvest 🧺
          </button>
        )}
        {state.status === "growing" && !state.doneToday && !state.restToday && state.nextAction !== "none" && (
          <button className="btn" onClick={() => onAct(state.nextAction as "plant" | "water" | "weed")}>
            I did it today · {ACTION_LABEL[state.nextAction as "plant" | "water" | "weed"]}
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
