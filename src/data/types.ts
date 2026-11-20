import type { Day } from "../lib/dates";
import type { CropType } from "../game/crops";
import type { CompletionKind } from "../game/engine";

export interface Profile {
  id: string;
  display_name: string | null;
  farm_name: string | null;
  timezone: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  crop_type: CropType;
  plot_index: number;
  cycle_started_on: Day;
  created_at: string;
  archived_at: string | null;
}

export interface Completion {
  id: string;
  habit_id: string;
  day: Day;
  kind: CompletionKind;
}

export interface Harvest {
  id: string;
  habit_id: string | null;
  crop_type: CropType;
  habit_name: string;
  harvested_on: Day;
  cycle_length: number;
}

export interface Cycle {
  id: string;
  habit_id: string | null;
  crop_type: CropType;
  habit_name: string;
  started_on: Day;
  ended_on: Day;
  outcome: "harvested" | "died";
}

export const MAX_PLOTS = 9;
