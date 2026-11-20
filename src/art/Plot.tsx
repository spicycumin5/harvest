import { Box, P, pts } from "./iso";
import { Tile } from "./Island";
import type { CropType } from "../game/crops";
import type { PlotState } from "../game/engine";

/** A single plot on its own little floating block, for the plot card. */
export function PlotScene({ crop, state }: { crop?: CropType; state?: PlotState }) {
  const s = 1.3;
  return (
    <svg viewBox="-72 -92 144 210" className="plot-diorama" aria-hidden="true">
      <g className="island-float">
        <polygon points={pts(P(0, s, -0.4), P(s, s, -0.4), P(s * 0.5, s * 0.5, -1.4))} fill="#cdb2d6" />
        <polygon points={pts(P(s, 0, -0.4), P(s, s, -0.4), P(s * 0.5, s * 0.5, -1.4))} fill="#a98dbd" />
        <Box x={0} y={0} z={-0.4} w={s} d={s} h={0.4} c={{ top: "#cdeac7", left: "#f6cbb7", right: "#e5ab9c" }} />
        <Tile x={0.15} y={0.15} crop={crop} state={state} />
      </g>
    </svg>
  );
}

/** Three small lights standing in for hearts. */
export function Hearts({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span className="hearts" aria-label={`${count} of ${max} hearts`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`heart${i < count ? " on" : ""}`} />
      ))}
    </span>
  );
}
