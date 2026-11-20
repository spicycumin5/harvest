import { useMemo } from "react";
import { useCompletions, useCycles, useHabits, useHarvests, useTendedDays, useToday } from "../data/hooks";
import type { Completion } from "../data/types";
import { addDays, dayRange, formatDay, type Day } from "../lib/dates";
import { streaks } from "../game/engine";
import { CROP_TYPES, CROPS, isUnlocked } from "../game/crops";
import { CropIcon } from "../art/Crop";
import { Loading } from "../components/ui";

const WEEKS = 12;

/** The farm's records: seeds, pantry, calendars and compost. Shown in a panel. */
export function AlmanacPanel() {
  const habits = useHabits();
  const completions = useCompletions();
  const harvests = useHarvests();
  const cycles = useCycles();
  const today = useToday();
  const tended = useTendedDays();

  const byHabit = useMemo(() => {
    const m = new Map<string, Completion[]>();
    for (const c of completions.data ?? []) m.set(c.habit_id, [...(m.get(c.habit_id) ?? []), c]);
    return m;
  }, [completions.data]);

  if (habits.isLoading || completions.isLoading) return <Loading label="Opening the almanac…" />;

  const pantry = CROP_TYPES.map((c) => ({ crop: c, count: (harvests.data ?? []).filter((h) => h.crop_type === c).length })).filter((p) => p.count > 0);
  const compost = (cycles.data ?? []).filter((c) => c.outcome === "died");

  return (
    <div className="stack panel-stack">
      <section className="stack">
        <h3>Seed shed</h3>
        <p className="small muted" style={{ margin: 0 }}>
          You've tended your farm on <strong>{tended}</strong> {tended === 1 ? "day" : "days"}. New seeds arrive as that number grows.
        </p>
        <div className="seed-shed">
          {CROP_TYPES.map((c) => {
            const open = isUnlocked(c, tended);
            const pct = Math.min(100, Math.round((tended / Math.max(1, CROPS[c].unlockAt)) * 100));
            return (
              <div key={c} className={`seed-packet${open ? "" : " locked"}`}>
                <CropIcon type={c} size={52} />
                <span className="small">{CROPS[c].label}</span>
                {open ? (
                  <span className="crop-meta">{CROPS[c].growDays + 2} days to grow</span>
                ) : (
                  <>
                    <span className="unlock-bar" aria-hidden="true">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span className="crop-meta">at {CROPS[c].unlockAt} days</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h3>Pantry</h3>
        {pantry.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>The pantry shelves are empty for now. Keep tending a crop until it ripens to bring in your first harvest.</p>
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
        <h3>Habit calendars</h3>
        <p className="muted small">The last {WEEKS} weeks. Green is a tended day, yellow is a rest day.</p>
        {(habits.data ?? []).map((h) => {
          const cs = byHabit.get(h.id) ?? [];
          const { current, best } = streaks(cs, today);
          return (
            <div key={h.id} className="panel-section almanac-habit">
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
        <h3>Compost heap</h3>
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
