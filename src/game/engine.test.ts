import { describe, expect, it } from "vitest";
import { addDays, type Day } from "../lib/dates";
import { canRest, computePlot, isEditableDay, streaks, type CompletionLike, type HabitLike } from "./engine";

const START: Day = "2026-01-01";
const habit: HabitLike = { crop_type: "carrot", cycle_started_on: START };
const d = (n: number) => addDays(START, n);
const done = (...days: number[]): CompletionLike[] => days.map((n) => ({ day: d(n), kind: "done" }));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("computePlot", () => {
  it("starts as bare soil that needs planting", () => {
    const s = computePlot(habit, [], START);
    expect(s).toMatchObject({ status: "growing", stage: "bare", hearts: 3, weeds: 0, nextAction: "plant" });
  });

  it("does not count the creation day as a miss", () => {
    const s = computePlot(habit, [], d(1));
    expect(s.hearts).toBe(3);
    expect(s.weeds).toBe(0);
  });

  it("grows through each stage", () => {
    const at = (n: number) => computePlot(habit, done(...range(0, n - 1)), d(n - 1)).stage;
    expect(at(1)).toBe("seed");
    expect(at(3)).toBe("sprout");
    expect(at(7)).toBe("young");
    expect(at(14)).toBe("bloom");
    expect(at(21)).toBe("ripe");
  });

  it("asks to water once planted and done today is idle", () => {
    expect(computePlot(habit, done(0), d(1)).nextAction).toBe("water");
    expect(computePlot(habit, done(0, 1), d(1)).nextAction).toBe("none");
  });

  it("loses a heart and gains a weed per missed day", () => {
    const one = computePlot(habit, done(0), d(2)); // missed d1
    expect(one).toMatchObject({ hearts: 2, weeds: 1, nextAction: "weed" });
    const two = computePlot(habit, done(0), d(3));
    expect(two).toMatchObject({ hearts: 1, weeds: 2, status: "growing" });
  });

  it("dies after three misses in a row", () => {
    const s = computePlot(habit, done(0), d(4));
    expect(s).toMatchObject({ status: "dead", nextAction: "replant", diedOn: d(3), hearts: 0 });
  });

  it("recovers a heart and clears weeds on a check-in", () => {
    const s = computePlot(habit, done(0, 3), d(3)); // missed d1, d2; done today
    expect(s).toMatchObject({ hearts: 2, weeds: 0, growth: 2 });
  });

  it("missing today costs nothing yet", () => {
    expect(computePlot(habit, done(0, 1), d(2)).hearts).toBe(3);
  });

  it("rest days keep hearts and don't grow", () => {
    const s = computePlot(habit, [...done(0), { day: d(1), kind: "rest" }], d(2));
    expect(s).toMatchObject({ hearts: 3, weeds: 0, growth: 1 });
  });

  it("backfilling yesterday can save a plot", () => {
    expect(computePlot(habit, done(0), d(4)).status).toBe("dead");
    expect(computePlot(habit, done(0, 3), d(4)).status).toBe("growing");
  });

  it("asks to harvest once ripe and ignores growth past ripe", () => {
    const s = computePlot(habit, done(...range(0, 25)), d(25));
    expect(s).toMatchObject({ status: "ripe", nextAction: "harvest", growth: 21, daysToRipe: 0 });
  });

  it("a new cycle ignores completions from before it began", () => {
    const replanted: HabitLike = { ...habit, cycle_started_on: d(10) };
    const s = computePlot(replanted, done(...range(0, 9)), d(10));
    expect(s).toMatchObject({ stage: "bare", growth: 0, hearts: 3, nextAction: "plant" });
  });

  it("is fallow before the cycle begins (after a harvest)", () => {
    const s = computePlot({ ...habit, cycle_started_on: d(1) }, [], d(0));
    expect(s).toMatchObject({ status: "fallow", nextAction: "none" });
  });
});

describe("isEditableDay", () => {
  it("allows today and yesterday only, within the cycle", () => {
    expect(isEditableDay(d(5), d(5), START)).toBe(true);
    expect(isEditableDay(d(4), d(5), START)).toBe(true);
    expect(isEditableDay(d(3), d(5), START)).toBe(false);
    expect(isEditableDay(d(6), d(5), START)).toBe(false);
    expect(isEditableDay(d(4), d(5), d(5))).toBe(false);
  });
});

describe("canRest", () => {
  it("allows one rest per rolling week", () => {
    const c: CompletionLike[] = [{ day: d(0), kind: "rest" }];
    expect(canRest(c, d(6))).toBe(false);
    expect(canRest(c, d(7))).toBe(true);
    expect(canRest(c, d(0))).toBe(true); // the rest day itself can be re-chosen
  });
});

describe("streaks", () => {
  it("counts current and best, with rest days neutral", () => {
    const c: CompletionLike[] = [...done(0, 1, 2), ...done(5, 6), { day: d(7), kind: "rest" }, ...done(8)];
    expect(streaks(c, d(8))).toEqual({ current: 3, best: 3 });
    expect(streaks(c, d(9))).toEqual({ current: 3, best: 3 }); // today not done yet
    expect(streaks(c, d(10))).toEqual({ current: 0, best: 3 });
  });
});
