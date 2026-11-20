import { useMemo, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Box, P, Pyramid, pts, topFace, type Pt, type Shades } from "./iso";
import { CropArt } from "./Crop";
import { Wanderer, type FarmerPose } from "./Farmer";
import type { CropType } from "../game/crops";
import type { PlotState } from "../game/engine";

// ── layout (grid units) ─────────────────────────────────────────────────────

const M = 0.6; // margin around the plots
const G = 0.36; // path between plots
const STEP = 1 + G;
export const ISLAND = 2 * M + 3 + 2 * G; // island edge length
const DEPTH = 1.15; // height of the island's cut sides
const TILE_H = 0.14;

export type GridPt = [number, number];

export function plotOrigin(index: number): GridPt {
  return [M + (index % 3) * STEP, M + Math.floor(index / 3) * STEP];
}

const lane = (k: number) => M + k * STEP - G / 2; // centre of the k-th path (0..3)

export const HOME: GridPt = [ISLAND - 0.36, ISLAND - 0.36];

/** Walk from home along the paths to stand in front of a plot. */
export function routeTo(index: number): GridPt[] {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const frontLane = lane(row + 1);
  const stand: GridPt = [M + col * STEP + 0.62, frontLane];
  return [HOME, [lane(3), HOME[1]], [lane(3), frontLane], stand];
}

// ── palettes ────────────────────────────────────────────────────────────────

export type DayPhase = "dawn" | "day" | "dusk" | "night";

export function phaseForHour(h: number): DayPhase {
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

const SKY: Record<DayPhase, [string, string, string]> = {
  dawn: ["#f2b6c6", "#f9d3c8", "#fde8d4"],
  day: ["#9cd1e2", "#cfe8ea", "#fbe4d8"],
  dusk: ["#a28fd0", "#e8a6bb", "#f8c8a6"],
  night: ["#1f2650", "#3c4380", "#7a6ea6"],
};

const SUN: Record<DayPhase, { x: number; y: number; r: number; c: string }> = {
  dawn: { x: -300, y: 70, r: 46, c: "#ffe6bf" },
  day: { x: 250, y: -80, r: 40, c: "#fff3d6" },
  dusk: { x: 300, y: 60, r: 50, c: "#ffd1a1" },
  night: { x: 250, y: -80, r: 26, c: "#f4eefc" },
};

const GRASS: Shades = { top: "#cdeac7", left: "#b4dcb0", right: "#9ccb9e" };
const BANDS: { z: [number, number]; left: string; right: string }[] = [
  { z: [0, -0.12], left: GRASS.left, right: GRASS.right },
  { z: [-0.12, -0.62], left: "#f6cbb7", right: "#e5ab9c" },
  { z: [-0.62, -DEPTH], left: "#e1bfd8", right: "#c9a0c4" },
];
const SOIL: Shades = { top: "#f0c4b0", left: "#e3aa98", right: "#cf9488" };
const SOIL_WET: Shades = { top: "#e2a593", left: "#d6998a", right: "#c3877f" };
const SOIL_DEAD: Shades = { top: "#d9ccd6", left: "#c6b6c5", right: "#b2a1b5" };

// ── scene pieces ────────────────────────────────────────────────────────────

function Backdrop({ phase }: { phase: DayPhase }) {
  const [a, b, c] = SKY[phase];
  const sun = SUN[phase];
  const night = phase === "night";
  return (
    <g>
      <defs>
        <linearGradient id={`sky-${phase}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <radialGradient id={`sun-${phase}`}>
          <stop offset="0" stopColor={sun.c} stopOpacity={0.95} />
          <stop offset="0.35" stopColor={sun.c} stopOpacity={0.5} />
          <stop offset="1" stopColor={sun.c} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-3000} y={-1500} width={6000} height={3000} fill={`url(#sky-${phase})`} />
      <circle cx={sun.x} cy={sun.y} r={sun.r * (night ? 2.6 : 4)} fill={`url(#sun-${phase})`} opacity={night ? 0.45 : 1} />
      {night ? (
        <path
          d={`M${sun.x} ${sun.y - sun.r} A${sun.r} ${sun.r} 0 1 0 ${sun.x} ${sun.y + sun.r} A${sun.r * 0.72} ${sun.r} 0 1 1 ${sun.x} ${sun.y - sun.r} Z`}
          fill={sun.c}
        />
      ) : (
        <circle cx={sun.x} cy={sun.y} r={sun.r} fill={sun.c} />
      )}
      {night && (
        <>
          {STARS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.7} fill="#fdf6ff" className="twinkle" style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
          ))}
        </>
      )}
      <Islet x={-350} y={30} s={0.3} night={night} />
      <Islet x={360} y={170} s={0.2} night={night} />
      <Islet x={-250} y={-150} s={0.14} night={night} />
    </g>
  );
}

const STARS: Pt[] = [
  [-420, -200], [-330, -120], [-250, -220], [-160, -160], [-60, -230], [40, -190], [120, -130], [190, -230],
  [330, -180], [400, -120], [-390, -40], [420, 0], [-200, -60], [80, -60], [360, 60], [-430, 120],
];

/** A distant floating islet, small and hazy. */
function Islet({ x, y, s, night }: { x: number; y: number; s: number; night: boolean }) {
  const k = 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={night ? 0.45 : 0.55} className="islet">
      <polygon points={topFace(0, 0, 0, k, k)} fill="#ffffff" opacity={0.75} />
      <polygon points={pts(P(0, k, 0), P(k, k, 0), P(k / 2, k / 2, -3.2))} fill="#f4dde6" />
      <polygon points={pts(P(k, 0, 0), P(k, k, 0), P(k / 2, k / 2, -3.2))} fill="#e3c4d6" />
      <Box x={1.2} y={1.2} w={0.5} d={0.5} h={1.8} c={{ top: "#ffffff", left: "#f6e6ee", right: "#e6cfe0" }} />
    </g>
  );
}

function CloudSea({ layer, night }: { layer: "back" | "front"; night: boolean }) {
  const blobs: [number, number, number, number][] =
    layer === "back"
      ? [[-1100, 420, 260, 50], [-760, 410, 220, 46], [-420, 410, 160, 40], [-200, 400, 190, 46], [60, 395, 200, 44], [320, 405, 180, 42], [640, 412, 230, 48], [980, 418, 260, 50], [-480, 470, 220, 60], [480, 470, 220, 60]]
      : [[-1000, 520, 300, 70], [-640, 530, 260, 60], [-340, 500, 240, 60], [-60, 520, 260, 60], [250, 505, 250, 62], [560, 530, 240, 56], [900, 520, 300, 70], [-60, 640, 900, 120]];
  return (
    <g className={`cloudsea cloudsea-${layer}`} filter="url(#cloud-blur)" opacity={layer === "back" ? 0.75 : 0.95}>
      {blobs.map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={night ? "#a9a3cf" : "#fffaf8"} />
      ))}
    </g>
  );
}

const MOTES: [number, number, number][] = [
  [-300, 120, 0], [-180, 60, 1.2], [-90, 220, 2.6], [20, 30, 3.4], [140, 180, 0.8], [260, 90, 2.1],
  [330, 250, 4.2], [-380, 260, 3.1], [70, 300, 1.7], [-230, 330, 5.0], [200, 340, 4.6], [-40, 140, 5.6],
];

function Motes({ night }: { night: boolean }) {
  return (
    <g className="motes" aria-hidden="true">
      {MOTES.map(([x, y, d], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={night ? 1.8 : 1.4}
          fill={night ? "#fff1a8" : "#ffffff"}
          filter="url(#glow-soft)"
          className="mote"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </g>
  );
}

function IslandBody() {
  const S = ISLAND;
  // The underside steps inward like an upside-down ziggurat, ending in a point.
  const tiers = [
    { inset: 0.45, h: 0.7, c: { top: "#d9bfdc", left: "#d7bad6", right: "#bb9cc4" } },
    { inset: 1.0, h: 0.6, c: { top: "#cdb2d6", left: "#c8a9cf", right: "#a98dbd" } },
    { inset: 1.55, h: 0.5, c: { top: "#c3a7d1", left: "#b99dca", right: "#9a7fb2" } },
  ];
  let z = -DEPTH;
  const tierEls = tiers.map((t, i) => {
    z -= t.h;
    return <Box key={i} x={t.inset} y={t.inset} z={z} w={S - 2 * t.inset} d={S - 2 * t.inset} h={t.h} c={t.c} />;
  });
  const last = tiers[tiers.length - 1];
  const tipW = S - 2 * last.inset;
  return (
    <g>
      {/* stepped underside, drawn bottom-up so upper tiers overlap lower ones */}
      <Pyramid x={last.inset} y={last.inset} z={z} w={tipW} d={tipW} h={-1.3} c={{ left: "#ad92c4", right: "#8c72a8" }} />
      {[...tierEls].reverse()}
      {/* cut sides in pastel strata */}
      {BANDS.map(({ z: [z1, z2], left, right }, i) => (
        <g key={i}>
          <polygon points={pts(P(0, S, z1), P(S, S, z1), P(S, S, z2), P(0, S, z2))} fill={left} />
          <polygon points={pts(P(S, 0, z1), P(S, S, z1), P(S, S, z2), P(S, 0, z2))} fill={right} />
        </g>
      ))}
      {/* grass top */}
      <polygon points={topFace(0, 0, 0, S, S)} fill={GRASS.top} />
      {/* paths between the plots */}
      <g fill="#f7eedf" opacity={0.85}>
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <polygon points={topFace(lane(k) - 0.11, lane(0), 0, 0.22, lane(3) - lane(0))} />
            <polygon points={topFace(lane(0), lane(k) - 0.11, 0, lane(3) - lane(0), 0.22)} />
          </g>
        ))}
        <polygon points={topFace(lane(3) - 0.11, lane(3), 0, 0.22, HOME[1] - lane(3))} />
        <polygon points={topFace(lane(3), HOME[1] - 0.11, 0, HOME[0] - lane(3), 0.22)} />
      </g>
      {/* stairs descending into the clouds */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box
          key={i}
          x={S + i * 0.3}
          y={2.25}
          z={-(i + 1) * 0.24}
          w={0.3}
          d={0.62}
          h={0.24}
          c={{ top: "#fbeee6", left: "#f1d6cd", right: "#ddb5b2" }}
        />
      ))}
    </g>
  );
}

function Tower() {
  const c = { top: "#fdeaea", left: "#f6cfd5", right: "#e2a9b9" };
  const x = 0.08;
  const y = 0.08;
  return (
    <g>
      <Box x={x} y={y} w={0.46} d={0.46} h={2.4} c={c} />
      {/* arched doorway on the front-left face */}
      <polygon
        points={pts(P(x + 0.14, y + 0.46, 0), P(x + 0.14, y + 0.46, 0.5), P(x + 0.23, y + 0.46, 0.62), P(x + 0.32, y + 0.46, 0.5), P(x + 0.32, y + 0.46, 0))}
        fill="#8d6f9e"
      />
      {/* window slit */}
      <polygon points={pts(P(x + 0.46, y + 0.18, 1.6), P(x + 0.46, y + 0.28, 1.6), P(x + 0.46, y + 0.28, 1.95), P(x + 0.46, y + 0.18, 1.95))} fill="#fff3c4" className="window-glow" />
      <Box x={x - 0.04} y={y - 0.04} z={2.4} w={0.54} d={0.54} h={0.1} c={{ top: "#fff6f2", left: "#f1d8dd", right: "#dcb2c2" }} />
      <Pyramid x={x - 0.04} y={y - 0.04} z={2.5} w={0.54} d={0.54} h={0.75} c={{ left: "#b9a0dc", right: "#9a81c4" }} />
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <Box x={x - 0.04} y={y - 0.04} w={0.08} d={0.08} h={0.35 * s} c={{ top: "#c9a28f", left: "#b98f7d", right: "#a17868" }} />
      <Pyramid x={x - 0.3 * s} y={y - 0.3 * s} z={0.25 * s} w={0.6 * s} d={0.6 * s} h={0.8 * s} c={{ left: "#a5d8be", right: "#7fbca3" }} />
      <Pyramid x={x - 0.22 * s} y={y - 0.22 * s} z={0.6 * s} w={0.44 * s} d={0.44 * s} h={0.7 * s} c={{ left: "#b6e2cb", right: "#8cc6ad" }} />
    </g>
  );
}

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Box x={x - 0.035} y={y - 0.035} w={0.07} d={0.07} h={0.62} c={{ top: "#efe0ea", left: "#d9c3d4", right: "#bea3bb" }} />
    </g>
  );
}

function LanternLight({ x, y, night }: { x: number; y: number; night: boolean }) {
  const [cx, cy] = P(x, y, 0.7);
  return (
    <g className="lantern-light">
      <circle cx={cx} cy={cy} r={night ? 16 : 8} fill="#fff1b8" opacity={night ? 0.5 : 0.3} filter="url(#glow)" />
      <circle cx={cx} cy={cy} r={3.2} fill="#fff6d2" />
    </g>
  );
}

function HomeStone() {
  const [hx, hy] = HOME;
  return (
    <g>
      <Box x={hx - 0.22} y={hy - 0.22} w={0.44} d={0.44} h={0.05} c={{ top: "#fff6ee", left: "#f0dcd6", right: "#dcc0c2" }} />
      <polygon points={topFace(hx - 0.12, hy - 0.12, 0.051, 0.24, 0.24)} fill="#fff3c4" opacity={0.7} filter="url(#glow-soft)" />
    </g>
  );
}

// ── plot tiles ──────────────────────────────────────────────────────────────

export interface IslandPlot {
  index: number;
  name: string;
  crop: CropType;
  state: PlotState;
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

/** One plot: a raised bed of soil, whatever grows in it, and its little signals. */
export function Tile({ x, y, crop, state, label }: { x: number; y: number; crop?: CropType; state?: PlotState; label?: string }) {
  const dead = state?.status === "dead";
  const c = dead ? SOIL_DEAD : state?.doneToday ? SOIL_WET : SOIL;
  const [cx, cy] = P(x + 0.5, y + 0.5, TILE_H);
  const droop = state && !dead ? (state.hearts >= 3 ? 0 : state.hearts === 2 ? 1 : 2) : 0;
  return (
    <g>
      {state?.doneToday && <polygon points={topFace(x - 0.06, y - 0.06, 0.005, 1.12, 1.12)} fill="#fff6d0" opacity={0.65} filter="url(#glow)" />}
      <Box x={x} y={y} w={1} d={1} h={TILE_H} c={c} />
      {/* furrows */}
      <g stroke={c.left} strokeWidth={1.2} opacity={0.8}>
        {[0.3, 0.55, 0.8].map((t) => {
          const [ax, ay] = P(x + 0.12, y + t, TILE_H);
          const [bx, by] = P(x + 0.88, y + t, TILE_H);
          return <line key={t} x1={ax} y1={ay} x2={bx} y2={by} />;
        })}
      </g>
      {state?.restToday && (
        <g>
          <polygon points={topFace(x + 0.06, y + 0.06, TILE_H + 0.02, 0.88, 0.88)} fill="#f9e9bf" />
          <polygon points={pts(P(x + 0.06, y + 0.94, TILE_H + 0.02), P(x + 0.94, y + 0.94, TILE_H + 0.02), P(x + 0.94, y + 0.94, TILE_H - 0.03), P(x + 0.06, y + 0.94, TILE_H - 0.03))} fill="#ecd59c" />
        </g>
      )}
      {crop && state && state.stage !== "bare" && state.status !== "fallow" && (
        <g transform={`translate(${cx} ${cy}) scale(0.95) translate(-50 -80)`}>
          <g className={dead ? undefined : "crop-sway"}>
            <CropArt type={crop} stage={state.stage} droop={droop} dead={dead} />
          </g>
        </g>
      )}
      {state && WEEDS.slice(0, state.weeds).map(([wx, wy], i) => <Weed key={i} at={P(x + wx, y + wy, TILE_H)} />)}
      {state?.status === "ripe" && (
        <g className="ripe-motes" fill="#fff4c8">
          {[
            [-16, -40],
            [14, -54],
            [4, -30],
          ].map(([dx, dy], i) => (
            <circle key={i} cx={cx + dx} cy={cy + dy} r={1.8} filter="url(#glow-soft)" className="mote" style={{ animationDelay: `${i * 0.9}s` }} />
          ))}
        </g>
      )}
      {label && (
        <g className="tile-label" transform={`translate(${cx} ${cy - 92})`}>
          <rect x={-(label.length * 3.6 + 12)} y={-12} width={label.length * 7.2 + 24} height={24} rx={12} fill="#ffffff" opacity={0.92} />
          <text textAnchor="middle" dy={4.5} fontSize={12.5} fill="#5b4b6b">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function EmptyTile({ x, y }: { x: number; y: number }) {
  const [cx, cy] = P(x + 0.5, y + 0.5, 0.01);
  return (
    <g className="empty-tile">
      <polygon points={topFace(x + 0.04, y + 0.04, 0.01, 0.92, 0.92)} fill="#ffffff" opacity={0.28} stroke="#ffffff" strokeWidth={1.4} strokeDasharray="5 5" />
      <path d={`M${cx - 6} ${cy} H${cx + 6} M${cx} ${cy - 6} V${cy + 6}`} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

// ── the whole island ────────────────────────────────────────────────────────

export interface FarmerMotion {
  pose: FarmerPose;
  /** Grid points to walk through; the last one is where the wanderer ends up. */
  path: GridPt[];
  /** Change to restart the walk. */
  key: number;
}

interface IslandProps {
  phase: DayPhase;
  plots: IslandPlot[];
  farmer?: FarmerMotion;
  showEmpty?: boolean;
  onSelectPlot?: (index: number) => void;
  onSelectEmpty?: (index: number) => void;
  selected?: number | null;
  className?: string;
  children?: ReactNode;
  /** Crop the scene: "full" shows sky above, "compact" tightens around the island. */
  framing?: "full" | "compact";
}

const SPEED = 2.6; // grid units per second

export function walkSeconds(path: GridPt[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return total / SPEED;
}

export function IslandScene({ phase, plots, farmer, showEmpty, onSelectPlot, onSelectEmpty, selected, className, framing = "full" }: IslandProps) {
  const night = phase === "night";
  const byIndex = new Map(plots.map((p) => [p.index, p]));

  const walk = useMemo(() => {
    const path = farmer?.path.length ? farmer.path : [HOME];
    const screen = path.map(([gx, gy]) => P(gx, gy, 0));
    let total = 0;
    const lens = [0];
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      lens.push(total);
    }
    const last = screen.length > 1 ? screen[screen.length - 1][0] - screen[screen.length - 2][0] : 1;
    return {
      x: screen.map((p) => p[0]),
      y: screen.map((p) => p[1]),
      times: total ? lens.map((l) => l / total) : [0],
      duration: total / SPEED,
      facing: (last < 0 ? -1 : 1) as 1 | -1,
    };
  }, [farmer?.path]);

  function keyHandler(fn?: () => void) {
    return (e: KeyboardEvent) => {
      if (fn && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        fn();
      }
    };
  }

  const viewBox = framing === "compact" ? "-330 -190 660 700" : "-400 -215 800 660";

  return (
    <svg viewBox={viewBox} className={`island-scene ${className ?? ""}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Your farm island">
      <Backdrop phase={phase} />
      <CloudSea layer="back" night={night} />
      <g className={`island-float${night ? " night" : ""}`}>
        <g className="island-shade">
          <IslandBody />
          <Tower />
          <Tree x={0.32} y={2.5} />
          <Tree x={2.45} y={0.28} s={0.75} />
          <Lantern x={0.3} y={ISLAND - 0.3} />
          <Lantern x={ISLAND - 0.3} y={0.3} />
          <HomeStone />
          {Array.from({ length: 9 }, (_, i) => {
            const [x, y] = plotOrigin(i);
            const p = byIndex.get(i);
            if (!p) {
              if (!showEmpty) return null;
              return (
                <g
                  key={i}
                  className="tile tile-empty"
                  role="button"
                  tabIndex={onSelectEmpty ? 0 : -1}
                  aria-label="Empty plot, plant a new habit"
                  onClick={() => onSelectEmpty?.(i)}
                  onKeyDown={keyHandler(() => onSelectEmpty?.(i))}
                >
                  <EmptyTile x={x} y={y} />
                </g>
              );
            }
            return (
              <g
                key={i}
                className={`tile${selected === i ? " selected" : ""}${onSelectPlot ? " interactive" : ""}`}
                role={onSelectPlot ? "button" : undefined}
                tabIndex={onSelectPlot ? 0 : undefined}
                aria-label={onSelectPlot ? `${p.name}: ${describePlot(p.state)}` : undefined}
                onClick={() => onSelectPlot?.(i)}
                onKeyDown={keyHandler(() => onSelectPlot?.(i))}
              >
                <Tile x={x} y={y} crop={p.crop} state={p.state} label={onSelectPlot ? p.name : undefined} />
              </g>
            );
          })}
        </g>
        <LanternLight x={0.3} y={ISLAND - 0.3} night={night} />
        <LanternLight x={ISLAND - 0.3} y={0.3} night={night} />
        <motion.g
          key={farmer?.key ?? 0}
          initial={{ x: walk.x[0], y: walk.y[0] }}
          animate={{ x: walk.x, y: walk.y }}
          transition={{ duration: walk.duration, times: walk.times, ease: "linear" }}
        >
          <Wanderer pose={farmer?.pose ?? "idle"} facing={walk.facing} />
        </motion.g>
      </g>
      <CloudSea layer="front" night={night} />
      <Motes night={night} />
    </svg>
  );
}

export function describePlot(s: PlotState): string {
  if (s.status === "dead") return "wilted";
  if (s.status === "fallow") return "resting soil";
  if (s.status === "ripe") return "ripe for harvest";
  return `${s.stage}, ${s.hearts} of 3 hearts${s.doneToday ? ", tended today" : ""}${s.restToday ? ", resting today" : ""}`;
}

/** Shared SVG filters. Render once near the root of the app. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="glow-soft" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cloud-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
    </svg>
  );
}

