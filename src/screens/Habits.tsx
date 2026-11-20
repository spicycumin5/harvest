import { useState, type FormEvent } from "react";
import { useCreateHabits, useHabits, useMoveHabit, useToday, useUpdateHabit } from "../data/hooks";
import { MAX_PLOTS, type Habit } from "../data/types";
import { CROP_TYPES, CROPS, type CropType } from "../game/crops";
import { CropIcon } from "../art/Crop";
import { CropPicker, ErrorNote, Loading } from "../components/ui";

export function Habits() {
  const habits = useHabits();
  const create = useCreateHabits();
  const today = useToday();
  const [name, setName] = useState("");
  const [crop, setCrop] = useState<CropType>("sunflower");

  if (habits.isLoading) return <Loading />;
  const list = habits.data ?? [];
  const used = new Set(list.map((h) => h.plot_index));
  const freePlot = Array.from({ length: MAX_PLOTS }, (_, i) => i).find((i) => !used.has(i));

  function add(e: FormEvent) {
    e.preventDefault();
    if (freePlot === undefined || !name.trim()) return;
    create.mutate(
      [{ name: name.trim(), crop_type: crop, plot_index: freePlot, cycle_started_on: today }],
      { onSuccess: () => setName("") },
    );
  }

  return (
    <div className="page narrow-wide">
      <h1>Your habits</h1>
      <p className="muted">Each habit grows in its own plot. You have room for {MAX_PLOTS}, but a small, well-tended field beats a big wild one.</p>

      {freePlot !== undefined ? (
        <form className="card stack" onSubmit={add}>
          <h3>Plant a new habit</h3>
          <div className="field">
            <label htmlFor="new-habit">What will you do each day?</label>
            <input id="new-habit" className="input" maxLength={60} placeholder="Read 10 pages" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <CropPicker value={crop} onChange={setCrop} size={48} />
          <ErrorNote error={create.error} />
          <div>
            <button className="btn sage" disabled={!name.trim() || create.isPending}>
              {create.isPending ? "Planting…" : `Plant in plot ${freePlot + 1}`}
            </button>
          </div>
        </form>
      ) : (
        <div className="card">
          <p>All {MAX_PLOTS} plots are planted. Archive a habit to make room for a new one.</p>
        </div>
      )}

      <div className="habit-list">
        {list.length === 0 && <p className="muted center">No habits yet. Plant your first one above.</p>}
        {list.map((h) => (
          <HabitRow key={h.id} habit={h} all={list} />
        ))}
      </div>
    </div>
  );
}

function HabitRow({ habit, all }: { habit: Habit; all: Habit[] }) {
  const update = useUpdateHabit();
  const move = useMoveHabit();
  const [name, setName] = useState(habit.name);
  const [confirming, setConfirming] = useState(false);

  function saveName() {
    const n = name.trim();
    if (n && n !== habit.name) update.mutate({ id: habit.id, name: n });
    else setName(habit.name);
  }

  return (
    <div className="card habit-row">
      <CropIcon type={habit.crop_type} size={64} />
      <div className="stack" style={{ flex: 1, gap: 10 }}>
        <input
          className="input habit-name"
          aria-label="Habit name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <div className="row">
          <label className="mini-field">
            Crop
            <select
              className="input"
              value={habit.crop_type}
              onChange={(e) => update.mutate({ id: habit.id, crop_type: e.target.value as CropType })}
            >
              {CROP_TYPES.map((c) => (
                <option key={c} value={c}>
                  {CROPS[c].label}
                </option>
              ))}
            </select>
          </label>
          <label className="mini-field">
            Plot
            <select
              className="input"
              value={habit.plot_index}
              onChange={(e) => {
                const to = Number(e.target.value);
                move.mutate({ habit, to, occupant: all.find((o) => o.plot_index === to) });
              }}
            >
              {Array.from({ length: MAX_PLOTS }, (_, i) => {
                const occupant = all.find((o) => o.plot_index === i && o.id !== habit.id);
                return (
                  <option key={i} value={i}>
                    {i + 1}
                    {occupant ? ` (swap with ${occupant.name})` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <div style={{ marginLeft: "auto" }}>
            {confirming ? (
              <span className="row">
                <span className="small muted">Archive? Its history stays in the almanac.</span>
                <button className="btn blush small" onClick={() => update.mutate({ id: habit.id, archived_at: new Date().toISOString() })}>
                  Archive
                </button>
                <button className="btn ghost small" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button className="btn ghost small" onClick={() => setConfirming(true)}>
                Archive
              </button>
            )}
          </div>
        </div>
        <ErrorNote error={update.error ?? move.error} />
      </div>
    </div>
  );
}
