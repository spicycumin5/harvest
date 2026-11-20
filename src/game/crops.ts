export type CropType =
  | "carrot"
  | "sunflower"
  | "wheat"
  | "strawberry"
  | "lavender"
  | "tomato"
  | "pumpkin"
  | "rose"
  | "cherry";

/**
 * A plot's life: untilled soil → plowed (day 1) → seeds planted (day 2) → many days of
 * watering through sprout, young plant and bloom → ripe.
 */
export type Stage = "bare" | "plowed" | "seeded" | "sprout" | "young" | "bloom" | "ripe";

export const STAGES: Stage[] = ["bare", "plowed", "seeded", "sprout", "young", "bloom", "ripe"];

export interface CropConfig {
  type: CropType;
  label: string;
  produce: string; // what lands in the pantry
  /** Days of watering after the seeds go in, until harvest. */
  growDays: number;
  /** Total tended days (across all habits) needed before this crop can be planted. */
  unlockAt: number;
  /** Tended days needed to reach each stage. */
  thresholds: Record<Stage, number>;
}

function thresholds(growDays: number): Record<Stage, number> {
  const after = (f: number) => 2 + Math.max(1, Math.round(growDays * f));
  return {
    bare: 0,
    plowed: 1,
    seeded: 2,
    sprout: after(0.18),
    young: after(0.42),
    bloom: after(0.72),
    ripe: 2 + growDays,
  };
}

function crop(type: CropType, label: string, produce: string, growDays: number, unlockAt: number): CropConfig {
  return { type, label, produce, growDays, unlockAt, thresholds: thresholds(growDays) };
}

export const CROPS: Record<CropType, CropConfig> = {
  carrot: crop("carrot", "Carrot", "Carrots", 18, 0),
  sunflower: crop("sunflower", "Sunflower", "Sunflowers", 21, 0),
  wheat: crop("wheat", "Wheat", "Wheat sheaves", 20, 0),
  strawberry: crop("strawberry", "Strawberry", "Strawberries", 22, 10),
  lavender: crop("lavender", "Lavender", "Lavender bundles", 24, 25),
  tomato: crop("tomato", "Tomato", "Tomatoes", 25, 45),
  pumpkin: crop("pumpkin", "Pumpkin", "Pumpkins", 30, 70),
  rose: crop("rose", "Rose", "Roses", 32, 100),
  cherry: crop("cherry", "Cherry tree", "Cherries", 40, 150),
};

/** In unlock order. */
export const CROP_TYPES = (Object.keys(CROPS) as CropType[]).sort((a, b) => CROPS[a].unlockAt - CROPS[b].unlockAt);

export function stageFor(crop: CropType, growth: number): Stage {
  const t = CROPS[crop].thresholds;
  let stage: Stage = "bare";
  for (const s of STAGES) if (growth >= t[s]) stage = s;
  return stage;
}

export const STAGE_LABEL: Record<Stage, string> = {
  bare: "Untilled soil",
  plowed: "Plowed",
  seeded: "Seeds planted",
  sprout: "Sprout",
  young: "Young plant",
  bloom: "Blooming",
  ripe: "Ripe",
};

// ── unlocking ───────────────────────────────────────────────────────────────

export function isUnlocked(crop: CropType, tendedDays: number): boolean {
  return tendedDays >= CROPS[crop].unlockAt;
}

export function unlockedCrops(tendedDays: number): CropType[] {
  return CROP_TYPES.filter((c) => isUnlocked(c, tendedDays));
}

/** The next crop still locked, and how many more tended days it needs. */
export function nextUnlock(tendedDays: number): { crop: CropType; remaining: number } | null {
  const next = CROP_TYPES.find((c) => !isUnlocked(c, tendedDays));
  return next ? { crop: next, remaining: CROPS[next].unlockAt - tendedDays } : null;
}
