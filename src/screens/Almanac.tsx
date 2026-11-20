import { useMemo } from "react";
import { useCompletions, useCycles, useHabits, useHarvests, useToday } from "../data/hooks";
import type { Completion } from "../data/types";
import { addDays, dayRange, formatDay, type Day } from "../lib/dates";
import { streaks } from "../game/engine";
import { CROP_TYPES, CROPS } from "../game/crops";
import { CropIcon } from "../art/Crop";
import { Loading } from "../components/ui";

const WEEKS = 12;

export function Almanac() {
  const habits = useHabits();
  const completions = useCompletions();
  const harvests = useHarvests();
  const cycles = useCycles();
  const today = useToday();

  const byHabit = useMemo(() => {
    const m = new Map<string, Completion[]>();
    for (const c of completions.data ?? []) m.set(c.habit_id, [...(m.get(c.habit_id) ?? []), c]);
    return m;
  }, [completions.data]);

  if (habits.isLoading || completions.isLoading) return <Loading label="Opening the almanac…" />;

  const pantry = CROP_TYPES.map((c) => ({ crop: c, count: (harvests.data ?? []).filter((h) => h.crop_type === c).length })).filter((p) => p.count > 0);
  const compost = (cycles.data ?? []).filter((c) => c.outcome === "died");

  return (
    <div className="page narrow-wide">
      <h1>Almanac</h1>
      <p className="muted">A record of the seasons on your farm.</p>

      <section className="stack">
        <h2>Pantry</h2>
        {pantry.length === 0 ? (
          <div className="card muted">The pantry shelves are empty for now. Tend a crop for 21 days to bring in your first harvest.</div>
        ) : (
          <div className="shelf">
            {pantry.map((p) => (
              <div key={p.crop} className="jar">
                <CropIcon type={p.crop} size={68} />
                <span className="jar-count">×{p.count}</span>
                <span className="small">{CROPS[p.crop].produce}</span>
              </div>
            ))}
            <div className="shelf-board" aria-hidden="true" />
          </div>
        )}
      </section>

      <section className="stack">
        <h2>Habit calendars</h2>
        <p className="muted small">The last {WEEKS} weeks. Green is a tended day, yellow is a rest day.</p>
        {(habits.data ?? []).map((h) => {
          const cs = byHabit.get(h.id) ?? [];
          const { current, best } = streaks(cs, today);
          return (
            <div key={h.id} className="card almanac-habit">
              <div className="row">
                <CropIcon type={h.crop_type} size={44} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{h.name}</h3>
                  <span className="small muted">
                    Streak {current} · Best {best} · {cs.filter((c) => c.kind === "done").length} days tended in total
                  </span>
                </div>
              </div>
              <Calendar completions={cs} today={today} />
            </div>
          );
        })}
      </section>

      <section className="stack">
        <h2>Compost heap</h2>
        {compost.length === 0 ? (
          <p className="muted">Nothing here. Every crop you've planted is still standing. 🌼</p>
        ) : (
          <>
            <p className="muted small">Crops that wilted go back into the soil and feed the next season. Nothing is wasted.</p>
            <ul className="compost">
              {compost.map((c) => (
                <li key={c.id}>
                  <strong>{c.habit_name}</strong>: {CROPS[c.crop_type].label.toLowerCase()} grown {formatDay(c.started_on)} to {formatDay(c.ended_on)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Calendar({ completions, today }: { completions: Completion[]; today: Day }) {
  const kinds = new Map(completions.map((c) => [c.day, c.kind]));
  // Align to weeks starting Monday, ending with the week that contains today.
  const dow = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7;
  const end = addDays(today, 6 - dow);
  const start = addDays(end, -(WEEKS * 7 - 1));
  const days = dayRange(start, end);
  return (
    <div className="calendar" role="img" aria-label="Calendar of tended days">
      {days.map((d) => (
        <span
          key={d}
          className={`cal-day ${kinds.get(d) ?? ""}${d > today ? " future" : ""}${d === today ? " today" : ""}`}
          title={`${formatDay(d)}${kinds.get(d) ? ` · ${kinds.get(d)}` : ""}`}
        />
      ))}
    </div>
  );
}
