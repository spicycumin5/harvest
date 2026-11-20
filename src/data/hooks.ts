import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { addDays, devTodayOverride, todayIn, type Day } from "../lib/dates";
import type { CropType } from "../game/crops";
import type { CompletionKind } from "../game/engine";
import { useUserId } from "./session";
import type { Completion, Cycle, Habit, Harvest, Profile } from "./types";

function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

const keys = {
  profile: (uid: string) => ["profile", uid] as const,
  habits: (uid: string) => ["habits", uid] as const,
  completions: (uid: string) => ["completions", uid] as const,
  harvests: (uid: string) => ["harvests", uid] as const,
  cycles: (uid: string) => ["cycles", uid] as const,
};

// ── profile ──────────────────────────────────────────────────────────────

export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.profile(uid),
    queryFn: async () => unwrap<Profile>(await supabase.from("profiles").select("*").eq("id", uid).single()),
  });
}

export function useUpdateProfile() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, "id">>) =>
      unwrap<Profile>(await supabase.from("profiles").update(patch).eq("id", uid).select().single()),
    onSuccess: (p) => qc.setQueryData(keys.profile(uid), p),
  });
}

/** Today in the farmer's time zone; re-checks every minute so midnight rolls over. */
export function useToday(): Day {
  const { data: profile } = useProfile();
  const tz = profile?.timezone ?? "UTC";
  const [today, setToday] = useState(() => devTodayOverride() ?? todayIn(tz));
  useEffect(() => {
    const compute = () => setToday(devTodayOverride() ?? todayIn(tz));
    compute();
    const t = setInterval(compute, 60_000);
    return () => clearInterval(t);
  }, [tz]);
  return today;
}

// ── habits ───────────────────────────────────────────────────────────────

export function useHabits() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.habits(uid),
    queryFn: async () =>
      unwrap<Habit[]>(await supabase.from("habits").select("*").is("archived_at", null).order("plot_index")),
  });
}

export type NewHabit = { name: string; crop_type: CropType; plot_index: number; cycle_started_on: Day };

export function useCreateHabits() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: NewHabit[]) => unwrap<Habit[]>(await supabase.from("habits").insert(rows).select()),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.habits(uid) }),
  });
}

export function useUpdateHabit() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Habit> & { id: string }) =>
      unwrap<Habit>(await supabase.from("habits").update(patch).eq("id", id).select().single()),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.habits(uid) }),
  });
}

/** Moves a habit to another plot, swapping with whatever grows there. */
export function useMoveHabit() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habit, to, occupant }: { habit: Habit; to: number; occupant?: Habit }) => {
      if (occupant) unwrap(await supabase.from("habits").update({ plot_index: habit.plot_index }).eq("id", occupant.id));
      unwrap(await supabase.from("habits").update({ plot_index: to }).eq("id", habit.id));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.habits(uid) }),
  });
}

// ── completions ──────────────────────────────────────────────────────────

export function useCompletions() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.completions(uid),
    queryFn: async () =>
      unwrap<Completion[]>(await supabase.from("completions").select("id, habit_id, day, kind").order("day")),
  });
}

/** Marks a day as done / rest, or clears it (kind = null). Optimistic. */
export function useSetCompletion() {
  const uid = useUserId();
  const qc = useQueryClient();
  const key = keys.completions(uid);
  return useMutation({
    mutationFn: async ({ habitId, day, kind }: { habitId: string; day: Day; kind: CompletionKind | null }) => {
      if (kind === null) {
        unwrap(await supabase.from("completions").delete().eq("habit_id", habitId).eq("day", day));
      } else {
        unwrap(await supabase.from("completions").upsert({ habit_id: habitId, day, kind }, { onConflict: "habit_id,day" }));
      }
    },
    onMutate: async ({ habitId, day, kind }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Completion[]>(key) ?? [];
      const others = prev.filter((c) => !(c.habit_id === habitId && c.day === day));
      qc.setQueryData<Completion[]>(key, kind ? [...others, { id: `tmp-${habitId}-${day}`, habit_id: habitId, day, kind }] : others);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// ── seasons ──────────────────────────────────────────────────────────────

export function useHarvests() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.harvests(uid),
    queryFn: async () =>
      unwrap<Harvest[]>(await supabase.from("harvests").select("*").order("harvested_on", { ascending: false })),
  });
}

export function useCycles() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.cycles(uid),
    queryFn: async () => unwrap<Cycle[]>(await supabase.from("cycles").select("*").order("ended_on", { ascending: false })),
  });
}

/** Harvest or replant: a server-side function call that starts a new cycle. Optimistic. */
function useSeasonChange<V extends { habitId: string }>(
  rpc: string,
  args: (v: V) => Record<string, unknown>,
  newStart: (v: V) => Day,
) {
  const uid = useUserId();
  const qc = useQueryClient();
  const key = keys.habits(uid);
  return useMutation({
    mutationFn: async (v: V) => {
      unwrap(await supabase.rpc(rpc, args(v)));
    },
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Habit[]>(key);
      qc.setQueryData<Habit[]>(key, (hs) => hs?.map((h) => (h.id === v.habitId ? { ...h, cycle_started_on: newStart(v) } : h)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      for (const k of [key, keys.harvests(uid), keys.cycles(uid)]) qc.invalidateQueries({ queryKey: k });
    },
  });
}

export function useHarvest() {
  return useSeasonChange<{ habitId: string; today: Day }>(
    "harvest_habit",
    (v) => ({ p_habit_id: v.habitId, p_today: v.today }),
    (v) => addDays(v.today, 1),
  );
}

export function useReplant() {
  return useSeasonChange<{ habitId: string; diedOn: Day; today: Day }>(
    "replant_habit",
    (v) => ({ p_habit_id: v.habitId, p_died_on: v.diedOn, p_today: v.today }),
    (v) => v.today,
  );
}

/** Every day any habit was tended. Unlocks new crops. */
export function useTendedDays(): number {
  const { data } = useCompletions();
  return useMemo(() => (data ?? []).filter((c) => c.kind === "done").length, [data]);
}
