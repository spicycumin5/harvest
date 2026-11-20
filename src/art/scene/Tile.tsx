import { Box, P, pts, topFace, type Pt, type Shades } from "../iso";
import { CropArt } from "../Crop";
import { TILE_H, type GridPt } from "./layout";
import type { CropType } from "../../game/crops";
import type { PlotState, TendAction } from "../../game/engine";

/** How a theme dresses its beds: soil colours and the bed's sides. */
export interface BedStyle {
  soil: Shades;
  wet: Shades;
  untilled: string;
  dead: Shades;
}

export const PASTEL_BED: BedStyle = {
  soil: { top: "#f0c4b0", left: "#e3aa98", right: "#cf9488" },
  wet: { top: "#e2a593", left: "#d6998a", right: "#c3877f" },
  untilled: "#e4d6b8",
  dead: { top: "#d9ccd6", left: "#c6b6c5", right: "#b2a1b5" },
};

export type EffectAction = TendAction | "harvest" | "replant";

export interface TileEffect {
  action: EffectAction;
  key: number;
}

const WEEDS: GridPt[] = [
  [0.2, 0.78],
  [0.82, 0.24],
  [0.78, 0.8],
];

function Weed({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <g className="weed-sway">
        <polygon points="-1,0 -5,-7 1,0" fill="#6aa58a" />
        <polygon points="-1,0 1,-9 1.5,0" fill="#4f8c73" />
        <polygon points="0,0 5,-6 1.5,0" fill="#6aa58a" />
      </g>
    </g>
  );
}

/** Raised ridges of turned earth. */
function Furrows({ x, y, c }: { x: number; y: number; c: Shades }) {
  return (
    <g>
      {[0.22, 0.42, 0.62, 0.82].map((t) => {
        const a = P(x + 0.1, y + t, TILE_H);
        const b = P(x + 0.9, y + t, TILE_H);
        const a2 = P(x + 0.1, y + t + 0.07, TILE_H);
        const b2 = P(x + 0.9, y + t + 0.07, TILE_H);
        return (
          <g key={t}>
            <polygon points={pts(a, b, b2, a2)} fill={c.left} opacity={0.75} />
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#ffffff" strokeWidth={0.8} opacity={0.25} />
          </g>
        );
      })}
    </g>
  );
}

/** A one-off animation on the plot showing the job being done. */
function Effect({ effect, x, y }: { effect: TileEffect; x: number; y: number }) {
  const spots: GridPt[] = [
    [0.3, 0.3],
    [0.7, 0.32],
    [0.5, 0.55],
    [0.28, 0.75],
    [0.72, 0.72],
  ];
  const at = spots.map(([u, v]) => P(x + u, y + v, TILE_H));
  switch (effect.action) {
    case "plow":
    case "replant":
      return (
        <g key={effect.key} className="fx fx-plow">
          {at.map(([px, py], i) => (
            <g key={i} style={{ animationDelay: `${i * 0.28}s` }} className="fx-puff">
              <circle cx={px} cy={py - 2} r={5} fill="#f3e2cf" />
              <circle cx={px + 5} cy={py - 5} r={3.5} fill="#f8ece0" />
              <polygon points={`${px - 3},${py} ${px},${py - 4} ${px + 2},${py}`} fill="#cf9488" className="fx-clod" />
            </g>
          ))}
        </g>
      );
    case "plant":
      return (
        <g key={effect.key} className="fx fx-plant">
          {at.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={1.8} fill="#f6dc98" className="fx-seed" style={{ animationDelay: `${i * 0.22}s` }} />
          ))}
        </g>
      );
    case "water":
      return (
        <g key={effect.key} className="fx fx-water">
          {at.map(([px, py], i) => (
            <g key={i} style={{ animationDelay: `${i * 0.2}s` }}>
              <ellipse cx={px} cy={py} rx={1.2} ry={2.4} fill="#bfe6f5" className="fx-drop" style={{ animationDelay: `${i * 0.2}s` }} />
              <ellipse cx={px} cy={py} rx={7} ry={3.5} fill="none" stroke="#e6f6fc" strokeWidth={1.2} className="fx-ripple" style={{ animationDelay: `${i * 0.2 + 0.45}s` }} />
            </g>
          ))}
        </g>
      );
    case "weed":
      return (
        <g key={effect.key} className="fx fx-weed">
          {at.slice(0, 4).map(([px, py], i) => (
            <g key={i} className="fx-fly" style={{ animationDelay: `${i * 0.25}s`, ["--dx" as string]: `${(i % 2 ? 1 : -1) * 18}px` }}>
              <polygon points={`${px - 1},${py} ${px - 4},${py - 7} ${px + 1},${py}`} fill="#6aa58a" />
              <polygon points={`${px},${py} ${px + 1},${py - 8} ${px + 2},${py}`} fill="#4f8c73" />
            </g>
          ))}
        </g>
      );
    case "harvest":
      return (
        <g key={effect.key} className="fx fx-harvest">
          {at.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py - 20} r={3} fill={["#f59aa8", "#f9bf8c", "#f9dc8a", "#bba6ec", "#a8dcbf"][i]} className="fx-rise" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </g>
      );
  }
}

/** One plot: a raised bed, whatever grows in it, its signals, and any job in progress. */
export function Tile({
  x,
  y,
  crop,
  state,
  bed = PASTEL_BED,
  effect,
}: {
  x: number;
  y: number;
  crop?: CropType;
  state?: PlotState;
  bed?: BedStyle;
  effect?: TileEffect;
}) {
  const dead = state?.status === "dead";
  const untilled = !state || state.stage === "bare" || state.status === "fallow";
  const c = dead ? bed.dead : state?.doneToday ? bed.wet : bed.soil;
  const top = untilled && !dead ? bed.untilled : c.top;
  const [cx, cy] = P(x + 0.5, y + 0.5, TILE_H);
  const droop = state && !dead ? (state.hearts >= 3 ? 0 : state.hearts === 2 ? 1 : 2) : 0;
  const showCrop = crop && state && !untilled && state.stage !== "plowed";
  return (
    <g>
      {state?.doneToday && <polygon points={topFace(x - 0.06, y - 0.06, 0.005, 1.12, 1.12)} fill="#fff6d0" opacity={0.65} filter="url(#glow)" />}
      <Box x={x} y={y} w={1} d={1} h={TILE_H} c={{ ...c, top }} />
      {untilled ? (
        // compact, unturned ground with a few tufts of grass
        <g fill="#a9cf9f">
          {[
            [0.25, 0.3],
            [0.7, 0.45],
            [0.4, 0.75],
          ].map(([u, v], i) => {
            const [px, py] = P(x + u, y + v, TILE_H);
            return <polygon key={i} points={`${px - 3},${py} ${px - 1},${py - 4} ${px},${py} ${px + 1.5},${py - 5} ${px + 3},${py}`} />;
          })}
        </g>
      ) : (
        <Furrows x={x} y={y} c={c} />
      )}
      {state?.restToday && (
        <g>
          <polygon points={topFace(x + 0.06, y + 0.06, TILE_H + 0.02, 0.88, 0.88)} fill="#f9e9bf" />
          <polygon
            points={pts(P(x + 0.06, y + 0.94, TILE_H + 0.02), P(x + 0.94, y + 0.94, TILE_H + 0.02), P(x + 0.94, y + 0.94, TILE_H - 0.03), P(x + 0.06, y + 0.94, TILE_H - 0.03))}
            fill="#ecd59c"
          />
        </g>
      )}
      {showCrop && (
        <g transform={`translate(${cx} ${cy}) scale(0.95) translate(-50 -80)`}>
          <g className={dead ? undefined : "crop-sway"}>
            <CropArt type={crop} stage={state.stage} droop={droop} dead={dead} />
          </g>
        </g>
      )}
      {state && WEEDS.slice(0, state.weeds).map(([wx, wy], i) => <Weed key={i} at={P(x + wx, y + wy, TILE_H)} />)}
      {state?.status === "ripe" && (
        <g fill="#fff4c8">
          {[
            [-16, -40],
            [14, -54],
            [4, -30],
          ].map(([dx, dy], i) => (
            <circle key={i} cx={cx + dx} cy={cy + dy} r={1.8} filter="url(#glow-soft)" className="mote" style={{ animationDelay: `${i * 0.9}s` }} />
          ))}
        </g>
      )}
      {effect && <Effect effect={effect} x={x} y={y} />}
    </g>
  );
}

/** A plot's name, pinned on the path just in front of it. Drawn above all the plots. */
export function PlotLabel({ x, y, text, selected }: { x: number; y: number; text: string; selected?: boolean }) {
  const [fx, fy] = P(x + 1, y + 1, 0);
  const w = text.length * 6.2 + 20;
  return (
    <g className={`tile-label${selected ? " selected" : ""}`} transform={`translate(${fx} ${fy + 12})`} pointerEvents="none">
      <rect x={-w / 2} y={-10} width={w} height={20} rx={10} fill="#ffffff" opacity={selected ? 1 : 0.84} />
      <text textAnchor="middle" dy={4} fontSize={11} fill="#5b4b6b">
        {text}
      </text>
    </g>
  );
}

export function EmptyTile({ x, y }: { x: number; y: number }) {
  const [cx, cy] = P(x + 0.5, y + 0.5, 0.01);
  return (
    <g className="empty-tile">
      <polygon points={topFace(x + 0.04, y + 0.04, 0.01, 0.92, 0.92)} fill="#ffffff" opacity={0.28} stroke="#ffffff" strokeWidth={1.4} strokeDasharray="5 5" />
      <path d={`M${cx - 6} ${cy} H${cx + 6} M${cx} ${cy - 6} V${cy + 6}`} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}
