import { addDays, diffDays, type Day } from "../lib/dates";
import { CROPS, stageFor, type CropType, type Stage } from "./crops";

export const MAX_HEARTS = 3;

export type CompletionKind = "done" | "rest";

export interface HabitLike {
  crop_type: CropType;
  /** First day of the current growing cycle. That day is never counted as a miss. */
  cycle_started_on: Day;
}

export interface CompletionLike {
  day: Day;
  kind: CompletionKind;
}

export type PlotStatus = "fallow" | "growing" | "ripe" | "dead";
export type FarmerAction = "plow" | "plant" | "weed" | "water" | "harvest" | "replant" | "none";

/** The jobs a daily check-in can do. */
export type TendAction = "plow" | "plant" | "weed" | "water";

export interface PlotState {
  status: PlotStatus;
  stage: Stage;
  growth: number;
  hearts: number;
  weeds: number;
  doneToday: boolean;
  restToday: boolean;
  /** What tapping the plot will do right now. */
  nextAction: FarmerAction;
  diedOn: Day | null;
  /** Days remaining until the crop is ripe (0 when ripe). */
  daysToRipe: number;
}

/**
 * Derives a plot's state purely from its completion history.
 *
 * Each tended day moves the plot one step: the first plows the soil, the second plants
 * the seeds, and every day after that waters the crop until it ripens.
 *
 * Past days (before today) are settled: done → +1 growth, +1 heart, weeds cleared;
 * rest → nothing changes; missed → −1 heart, +1 weed. The cycle's first day is
 * never a miss. The plot dies when hearts reach 0 (e.g. three misses in a row).
 * Today is still open, so missing it costs nothing yet.
 */
export function computePlot(habit: HabitLike, completions: CompletionLike[], today: Day): PlotState {
  const crop = CROPS[habit.crop_type];
  const ripeAt = crop.thresholds.ripe;
  const start = habit.cycle_started_on;

  const byDay = new Map<Day, CompletionKind>();
  for (const c of completions) if (c.day >= start && c.day <= today) byDay.set(c.day, c.kind);

  const base = { doneToday: false, restToday: false, diedOn: null as Day | null };

  if (today < start) {
    return { ...base, status: "fallow", stage: "bare", growth: 0, hearts: MAX_HEARTS, weeds: 0, nextAction: "none", daysToRipe: ripeAt };
  }

  let growth = 0;
  let hearts = MAX_HEARTS;
  let weeds = 0;
  let diedOn: Day | null = null;

  for (let d = start; d < today; d = addDays(d, 1)) {
    const kind = byDay.get(d);
    if (kind === "done") {
      growth = Math.min(growth + 1, ripeAt);
      hearts = Math.min(hearts + 1, MAX_HEARTS);
      weeds = 0;
    } else if (kind === "rest" || d === start) {
      // a quiet day: nothing grows, nothing is lost
    } else {
      hearts -= 1;
      weeds = Math.min(weeds + 1, MAX_HEARTS);
      if (hearts <= 0) {
        diedOn = d;
        break;
      }
    }
  }

  if (diedOn) {
    return { ...base, status: "dead", stage: stageFor(habit.crop_type, growth), growth, hearts: 0, weeds, diedOn, nextAction: "replant", daysToRipe: ripeAt - growth };
  }

  const todayKind = byDay.get(today);
  const doneToday = todayKind === "done";
  const restToday = todayKind === "rest";
  if (doneToday) {
    growth = Math.min(growth + 1, ripeAt);
    hearts = Math.min(hearts + 1, MAX_HEARTS);
    weeds = 0;
  }

  const ripe = growth >= ripeAt;
  let nextAction: FarmerAction;
  if (ripe) nextAction = "harvest";
  else if (doneToday || restToday) nextAction = "none";
  else if (growth === 0) nextAction = "plow";
  else if (growth === 1) nextAction = "plant";
  else if (weeds > 0) nextAction = "weed";
  else nextAction = "water";

  return {
    status: ripe ? "ripe" : "growing",
    stage: stageFor(habit.crop_type, growth),
    growth,
    hearts,
    weeds,
    doneToday,
    restToday,
    nextAction,
    diedOn: null,
    daysToRipe: Math.max(0, ripeAt - growth),
  };
}

/** Days the user may still mark: today, and yesterday for late-night check-ins. */
export function isEditableDay(day: Day, today: Day, cycleStart: Day): boolean {
  const ago = diffDays(day, today);
  return ago >= 0 && ago <= 1 && day >= cycleStart;
}

/** One rest day per rolling 7 days. */
export function canRest(completions: CompletionLike[], day: Day): boolean {
  return !completions.some((c) => c.kind === "rest" && c.day !== day && Math.abs(diffDays(c.day, day)) < 7);
}

/**
 * Streaks across the habit's whole life. Rest days neither extend nor break a streak.
 * The current streak counts back from today, or from yesterday if today isn't done yet.
 */
export function streaks(completions: CompletionLike[], today: Day): { current: number; best: number } {
  const byDay = new Map<Day, CompletionKind>();
  for (const c of completions) if (c.day <= today) byDay.set(c.day, c.kind);
  if (byDay.size === 0) return { current: 0, best: 0 };

  const days = [...byDay.keys()].sort();
  let best = 0;
  let run = 0;
  for (let d = days[0]; d <= today; d = addDays(d, 1)) {
    const k = byDay.get(d);
    if (k === "done") best = Math.max(best, ++run);
    else if (k !== "rest" && d !== today) run = 0;
  }

  let current = 0;
  let d = byDay.has(today) ? today : addDays(today, -1);
  for (;;) {
    const k = byDay.get(d);
    if (k === "done") current++;
    else if (k !== "rest") break;
    d = addDays(d, -1);
  }
  return { current, best };
}
