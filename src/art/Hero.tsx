import { useMemo } from "react";
import { IslandScene, phaseForHour, type IslandPlot } from "./Island";
import type { FarmerPose } from "./Farmer";
import type { PlotState } from "../game/engine";

const base: PlotState = {
  status: "growing",
  stage: "young",
  growth: 8,
  hearts: 3,
  weeds: 0,
  doneToday: false,
  restToday: false,
  nextAction: "water",
  diedOn: null,
  daysToRipe: 13,
};

const DEMO: IslandPlot[] = [
  { index: 0, name: "", crop: "sunflower", state: { ...base, stage: "ripe", status: "ripe" } },
  { index: 1, name: "", crop: "lavender", state: { ...base, stage: "bloom" } },
  { index: 2, name: "", crop: "wheat", state: { ...base, stage: "ripe", status: "ripe" } },
  { index: 3, name: "", crop: "strawberry", state: { ...base, stage: "ripe", doneToday: true } },
  { index: 4, name: "", crop: "carrot", state: { ...base, stage: "young" } },
  { index: 5, name: "", crop: "pumpkin", state: { ...base, stage: "ripe" } },
  { index: 7, name: "", crop: "sunflower", state: { ...base, stage: "sprout" } },
];

/** A decorative island for the welcome and onboarding screens. */
export function HeroIsland({ pose = "idle", plotCount = DEMO.length }: { pose?: FarmerPose; plotCount?: number }) {
  const phase = phaseForHour(new Date().getHours());
  const plots = useMemo(() => DEMO.slice(0, plotCount), [plotCount]);
  return (
    <div className="hero">
      <IslandScene phase={phase} plots={plots} farmer={{ pose, path: [], key: 0 }} framing="full" />
    </div>
  );
}
