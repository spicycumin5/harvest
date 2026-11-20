export type CropType = "carrot" | "sunflower" | "strawberry" | "pumpkin" | "lavender" | "wheat";

export type Stage = "bare" | "seed" | "sprout" | "young" | "bloom" | "ripe";

export const STAGES: Stage[] = ["bare", "seed", "sprout", "young", "bloom", "ripe"];

export interface CropConfig {
  type: CropType;
  label: string;
  produce: string; // what lands in the pantry
  emoji: string;
  /** Growth points (completed days) needed to reach each stage. */
  thresholds: Record<Stage, number>;
}

const DEFAULT_THRESHOLDS: Record<Stage, number> = {
  bare: 0,
  seed: 1,
  sprout: 3,
  young: 7,
  bloom: 14,
  ripe: 21,
};

export const CROPS: Record<CropType, CropConfig> = {
  carrot: { type: "carrot", label: "Carrot", produce: "Carrots", emoji: "🥕", thresholds: DEFAULT_THRESHOLDS },
  sunflower: { type: "sunflower", label: "Sunflower", produce: "Sunflowers", emoji: "🌻", thresholds: DEFAULT_THRESHOLDS },
  strawberry: { type: "strawberry", label: "Strawberry", produce: "Strawberries", emoji: "🍓", thresholds: DEFAULT_THRESHOLDS },
  pumpkin: { type: "pumpkin", label: "Pumpkin", produce: "Pumpkins", emoji: "🎃", thresholds: DEFAULT_THRESHOLDS },
  lavender: { type: "lavender", label: "Lavender", produce: "Lavender bundles", emoji: "💜", thresholds: DEFAULT_THRESHOLDS },
  wheat: { type: "wheat", label: "Wheat", produce: "Wheat sheaves", emoji: "🌾", thresholds: DEFAULT_THRESHOLDS },
};

export const CROP_TYPES = Object.keys(CROPS) as CropType[];

export function stageFor(crop: CropType, growth: number): Stage {
  const t = CROPS[crop].thresholds;
  let stage: Stage = "bare";
  for (const s of STAGES) if (growth >= t[s]) stage = s;
  return stage;
}

export const STAGE_LABEL: Record<Stage, string> = {
  bare: "Bare soil",
  seed: "Seed",
  sprout: "Sprout",
  young: "Young plant",
  bloom: "Blooming",
  ripe: "Ripe",
};
