import type { FC } from "react";
import { Box, P, Pyramid, pts, topFace, type Pt, type Shades } from "../iso";
import { mixHex, type SkyState } from "../../lib/sky";
import type { ThemeId } from "../../data/types";
import { ISLAND as S } from "./layout";
import { PASTEL_BED, type BedStyle } from "./Tile";
import { CloudSea, Fence, Glow, Islet, Lantern, LanternLight, Motes, PineTree, RoundTree, dusk } from "./parts";

export interface SceneProps {
  sky: SkyState;
  dark: number;
  /** Horizontal half-width the sun travels across. */
  span: number;
  id: string;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  blurb: string;
  /** Where the sun sets in scene units. */
  horizonY: number;
  bed: BedStyle;
  pathColor: string;
  /** Does the whole scene gently bob? */
  floats: boolean;
  bounds: Bounds;
  /** Tighter bounds for tall, narrow screens; decorative edges may be cropped. */
  portraitBounds: Bounds;
  /** Behind everything except the sky: horizons, distant scenery. */
  Distant: FC<SceneProps>;
  /** The land the plots sit on, including its top surface. */
  Ground: FC<SceneProps>;
  /** Buildings and trees behind the plots. */
  Back: FC<SceneProps>;
  /** Things in front of the plots and the farmer. */
  Front: FC<SceneProps>;
  /** Lamps and glows, drawn above the land. */
  Lights: FC<SceneProps>;
}

const GRASS: Shades = { top: "#cdeac7", left: "#b4dcb0", right: "#9ccb9e" };

// ── Floating Isle ───────────────────────────────────────────────────────────

const DEPTH = 1.15;

function FloatingGround() {
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
  const bands: { z: [number, number]; left: string; right: string }[] = [
    { z: [0, -0.12], left: GRASS.left, right: GRASS.right },
    { z: [-0.12, -0.62], left: "#f6cbb7", right: "#e5ab9c" },
    { z: [-0.62, -DEPTH], left: "#e1bfd8", right: "#c9a0c4" },
  ];
  return (
    <g>
      <Pyramid x={last.inset} y={last.inset} z={z} w={tipW} d={tipW} h={-1.3} c={{ left: "#ad92c4", right: "#8c72a8" }} />
      {[...tierEls].reverse()}
      {bands.map(({ z: [z1, z2], left, right }, i) => (
        <g key={i}>
          <polygon points={pts(P(0, S, z1), P(S, S, z1), P(S, S, z2), P(0, S, z2))} fill={left} />
          <polygon points={pts(P(S, 0, z1), P(S, S, z1), P(S, S, z2), P(S, 0, z2))} fill={right} />
        </g>
      ))}
      <polygon points={topFace(0, 0, 0, S, S)} fill={GRASS.top} />
      {/* stairs descending into the clouds */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} x={S + i * 0.3} y={2.25} z={-(i + 1) * 0.24} w={0.3} d={0.62} h={0.24} c={{ top: "#fbeee6", left: "#f1d6cd", right: "#ddb5b2" }} />
      ))}
    </g>
  );
}

function FloatingBack() {
  const c = { top: "#fdeaea", left: "#f6cfd5", right: "#e2a9b9" };
  const x = 0.08;
  const y = 0.08;
  return (
    <g>
      <Box x={x} y={y} w={0.46} d={0.46} h={2.4} c={c} />
      <polygon
        points={pts(P(x + 0.14, y + 0.46, 0), P(x + 0.14, y + 0.46, 0.5), P(x + 0.23, y + 0.46, 0.62), P(x + 0.32, y + 0.46, 0.5), P(x + 0.32, y + 0.46, 0))}
        fill="#8d6f9e"
      />
      <polygon points={pts(P(x + 0.46, y + 0.18, 1.6), P(x + 0.46, y + 0.28, 1.6), P(x + 0.46, y + 0.28, 1.95), P(x + 0.46, y + 0.18, 1.95))} fill="#fff3c4" className="window-glow" />
      <Box x={x - 0.04} y={y - 0.04} z={2.4} w={0.54} d={0.54} h={0.1} c={{ top: "#fff6f2", left: "#f1d8dd", right: "#dcb2c2" }} />
      <Pyramid x={x - 0.04} y={y - 0.04} z={2.5} w={0.54} d={0.54} h={0.75} c={{ left: "#b9a0dc", right: "#9a81c4" }} />
      <PineTree x={0.32} y={2.5} />
      <PineTree x={2.45} y={0.28} s={0.75} />
      <Lantern x={0.3} y={S - 0.3} />
      <Lantern x={S - 0.3} y={0.3} />
    </g>
  );
}

const floating: ThemeDef = {
  id: "floating",
  name: "Floating Isle",
  blurb: "A quiet island drifting above a sea of clouds.",
  horizonY: 360,
  bed: PASTEL_BED,
  pathColor: "#f7eedf",
  floats: true,
  bounds: { left: -285, right: 285, top: -185, bottom: 395 },
  portraitBounds: { left: -272, right: 248, top: -185, bottom: 395 },
  Distant: ({ dark }) => (
    <g>
      <Islet x={-350} y={30} s={0.3} dark={dark} />
      <Islet x={360} y={170} s={0.2} dark={dark} />
      <Islet x={-250} y={-150} s={0.14} dark={dark} />
      <CloudSea layer="back" dark={dark} />
    </g>
  ),
  Ground: FloatingGround,
  Back: FloatingBack,
  Front: ({ dark }) => (
    <g>
      <CloudSea layer="front" dark={dark} />
      <Motes dark={dark} />
    </g>
  ),
  Lights: ({ dark }) => (
    <g>
      <LanternLight x={0.3} y={S - 0.3} dark={dark} />
      <LanternLight x={S - 0.3} y={0.3} dark={dark} />
    </g>
  ),
};

// ── grounded dioramas ───────────────────────────────────────────────────────
//
// The farm, backyard and ocean each sit on their own block, seen from the same
// isometric camera as everything else. There's no horizon line: the block rests in
// soft haze, the way a tabletop diorama would.

interface Layer {
  h: number;
  left: string;
  right: string;
}

/** A block of land (or water) from x0..x1, y0..y1 whose top is at z, with layered cut sides. */
function Slab({ x0, y0, x1, y1, z = 0, top, layers, topOpacity = 1 }: { x0: number; y0: number; x1: number; y1: number; z?: number; top: string; layers: Layer[]; topOpacity?: number }) {
  let zz = z;
  const faces = layers.map((l, i) => {
    const z1 = zz;
    const z2 = zz - l.h;
    zz = z2;
    return (
      <g key={i}>
        <polygon points={pts(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z2), P(x0, y1, z2))} fill={l.left} />
        <polygon points={pts(P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z2), P(x1, y0, z2))} fill={l.right} />
      </g>
    );
  });
  return (
    <g>
      {faces}
      <polygon points={topFace(x0, y0, z, x1 - x0, y1 - y0)} fill={top} opacity={topOpacity} />
    </g>
  );
}

/** A soft shadow cast by a block onto the haze below it. */
function SlabShadow({ x0, y0, x1, y1, z }: { x0: number; y0: number; x1: number; y1: number; z: number }) {
  return (
    <g transform="translate(0 46)" filter="url(#cloud-blur)">
      <polygon points={topFace(x0 + 0.4, y0 + 0.4, z, x1 - x0 - 0.8, y1 - y0 - 0.8)} fill="#4b3a5c" opacity={0.16} />
    </g>
  );
}

/** Low, soft haze that the dioramas rest in; the sun sets into it. */
function Haze({ sky, dark, tint }: SceneProps & { tint: string }) {
  const fill = dusk(mixHex(sky.colors[2], tint, 0.18), dark, 0.5);
  return (
    <g filter="url(#cloud-blur)" opacity={0.75}>
      {[
        [-1000, 470, 420, 90],
        [-420, 455, 330, 70],
        [120, 465, 380, 80],
        [640, 450, 340, 70],
        [1100, 470, 420, 90],
        [0, 640, 1600, 220],
      ].map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      ))}
    </g>
  );
}

const SKY_HORIZON = 380; // the sun sinks into the haze below the block

// ── Countryside Farm ────────────────────────────────────────────────────────

const FARM = { x0: -2.5, y0: -1.3, x1: S + 1.1, y1: S + 1.0 };

/** A field of crop rows on the land around the farm. */
function FieldPatch({ x, y, w, d, base, row, along }: { x: number; y: number; w: number; d: number; base: string; row: string; along: "x" | "y" }) {
  const rows = Math.floor((along === "x" ? d : w) / 0.28);
  return (
    <g>
      <polygon points={topFace(x, y, 0, w, d)} fill={base} />
      {Array.from({ length: rows }, (_, i) => {
        const t = 0.14 + i * 0.28;
        const [a, b] = along === "x" ? [P(x + 0.1, y + t), P(x + w - 0.1, y + t)] : [P(x + t, y + 0.1), P(x + t, y + d - 0.1)];
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={row} strokeWidth={4} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** A barn with a gable roof whose ridge runs along y. */
function Barn({ x, y, w, d, h, rh }: { x: number; y: number; w: number; d: number; h: number; rh: number }) {
  const x1 = x + w;
  const y1 = y + d;
  const xm = x + w / 2;
  return (
    <g>
      <polygon points={pts(P(x, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(xm, y1, h + rh), P(x, y1, h))} fill="#f2b8ad" />
      <polygon points={pts(P(x1, y, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y, h))} fill="#dc958c" />
      <polygon points={pts(P(x1, y, h), P(x1, y1, h), P(xm, y1, h + rh), P(xm, y, h + rh))} fill="#b8a1d4" />
      <polygon points={pts(P(x1 + 0.06, y - 0.06, h - 0.04), P(x1 + 0.06, y1 + 0.06, h - 0.04), P(x1, y1 + 0.06, h), P(x1, y - 0.06, h))} fill="#9d86bf" />
      {(() => {
        const a = P(x1, y + d * 0.3, 0);
        const b = P(x1, y + d * 0.7, 0);
        const c = P(x1, y + d * 0.7, h * 0.72);
        const e = P(x1, y + d * 0.3, h * 0.72);
        return (
          <g>
            <polygon points={pts(a, b, c, e)} fill="#fff3ea" />
            <line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke="#dc958c" strokeWidth={2} />
            <line x1={b[0]} y1={b[1]} x2={e[0]} y2={e[1]} stroke="#dc958c" strokeWidth={2} />
          </g>
        );
      })()}
      <polygon points={pts(P(xm - 0.14, y1, h + 0.05), P(xm + 0.14, y1, h + 0.05), P(xm + 0.14, y1, h + 0.32), P(xm - 0.14, y1, h + 0.32))} fill="#fff3c4" className="window-glow" />
    </g>
  );
}

function HayBale({ x, y }: { x: number; y: number }) {
  return <Box x={x} y={y} w={0.42} d={0.28} h={0.24} c={{ top: "#f9e3a3", left: "#efcf80", right: "#dcb865" }} />;
}

const FENCE: [string, string] = ["#f6e9dc", "#dcc6b4"];

const farm: ThemeDef = {
  id: "farm",
  name: "Countryside Farm",
  blurb: "Fields, a red barn and a fenced vegetable patch.",
  horizonY: SKY_HORIZON,
  bed: {
    soil: { top: "#dcae8f", left: "#c99a7c", right: "#b48568" },
    wet: { top: "#c9977a", left: "#bd8d71", right: "#a77a61" },
    untilled: "#d8cfa2",
    dead: { top: "#d2c6c8", left: "#beb0b4", right: "#a999a2" },
  },
  pathColor: "#f1e3c8",
  floats: false,
  bounds: { left: -415, right: 365, top: -185, bottom: 400 },
  portraitBounds: { left: -320, right: 300, top: -185, bottom: 395 },
  Distant: (p) => <Haze {...p} tint="#cfe6b5" />,
  Ground: ({ dark }) => (
    <g>
      <SlabShadow {...FARM} z={-0.92} />
      <Slab
        {...FARM}
        top="#c6e2ae"
        layers={[
          { h: 0.12, left: "#b2d79f", right: "#9cc78c" },
          { h: 0.45, left: "#e6bb9c", right: "#cf9f84" },
          { h: 0.35, left: "#d9aebb", right: "#bf93a6" },
        ]}
      />
      <FieldPatch x={-2.3} y={1.2} w={1.95} d={S - 0.4} base={dusk("#ecdfa4", dark, 0.3)} row={dusk("#dcc57a", dark, 0.3)} along="y" />
      <FieldPatch x={0.25} y={-1.15} w={S - 0.5} d={0.85} base={dusk("#d6cfe9", dark, 0.3)} row={dusk("#b9a6dc", dark, 0.3)} along="x" />
      {/* the vegetable patch itself */}
      <polygon points={topFace(-0.08, -0.08, 0, S + 0.16, S + 0.16)} fill="#e6d1b2" />
      <polygon points={topFace(0, 0, 0, S, S)} fill="#d3eab9" />
    </g>
  ),
  Back: () => (
    <g>
      <Barn x={-2.25} y={-1.1} w={1.5} d={1.7} h={1.15} rh={0.7} />
      <HayBale x={-0.65} y={0.75} />
      <Fence from={[0, 0]} to={[S, 0]} c={FENCE} />
      <Fence from={[0, 0]} to={[0, S]} c={FENCE} />
      <RoundTree x={S + 0.6} y={0.5} c={["#b4d9a8", "#8cbf83"]} />
      <RoundTree x={S + 0.65} y={2.2} s={0.8} c={["#c0e0b0", "#93c48a"]} />
    </g>
  ),
  Front: ({ dark }) => (
    <g>
      <Fence from={[0, S]} to={[S - 0.75, S]} c={FENCE} />
      <Fence from={[S, 0]} to={[S, S - 0.75]} c={FENCE} />
      <HayBale x={S + 0.3} y={S - 0.5} />
      <Motes dark={dark} />
    </g>
  ),
  Lights: ({ dark }) => (
    <g>
      <Glow at={P(S - 0.75, S, 0.5)} dark={dark} r={2.6} />
      <Glow at={P(S, S - 0.75, 0.5)} dark={dark} r={2.6} />
    </g>
  ),
};

// ── Backyard ────────────────────────────────────────────────────────────────

const YARD = { x0: -2.7, y0: -0.95, x1: S + 1.3, y1: S + 0.7 };

/** The back of a house, its long wall facing the yard. */
function House({ dark }: { dark: number }) {
  const x0 = -2.5;
  const x1 = -0.45;
  const y0 = -0.7;
  const y1 = S - 0.9;
  const h = 1.9;
  const rh = 0.85;
  const xm = (x0 + x1) / 2;
  const win = dark > 0.4 ? "#ffe9a8" : "#d6ecef";
  const window = (yc: number, z0: number, w = 0.42, hh = 0.5) => (
    <polygon
      key={yc}
      points={pts(P(x1, yc - w / 2, z0), P(x1, yc + w / 2, z0), P(x1, yc + w / 2, z0 + hh), P(x1, yc - w / 2, z0 + hh))}
      fill={win}
      filter={dark > 0.4 ? "url(#glow-soft)" : undefined}
    />
  );
  return (
    <g>
      <polygon points={pts(P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(xm, y1, h + rh), P(x0, y1, h))} fill="#f8ecdc" />
      <polygon points={pts(P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y0, h))} fill="#ead6c1" />
      <polygon points={pts(P(x1, y0, h), P(x1, y1, h), P(xm, y1, h + rh), P(xm, y0, h + rh))} fill="#b3a3c8" />
      <polygon points={pts(P(x1 + 0.08, y0 - 0.08, h - 0.05), P(x1 + 0.08, y1 + 0.08, h - 0.05), P(x1, y1 + 0.08, h), P(x1, y0 - 0.08, h))} fill="#9b8bb3" />
      {window(0.3, 0.75)}
      {window(1.3, 0.75)}
      {window(3.0, 0.75)}
      <polygon points={pts(P(x1, 2.0, 0), P(x1, 2.45, 0), P(x1, 2.45, 1.0), P(x1, 2.0, 1.0))} fill="#c8a7c4" />
      <circle cx={P(x1, 2.38, 0.5)[0]} cy={P(x1, 2.38, 0.5)[1]} r={1.3} fill="#fff3c4" />
      <Box x={x1} y={1.9} w={0.3} d={0.65} h={0.08} c={{ top: "#f1ebe4", left: "#ddd3c9", right: "#cbbfb4" }} />
      <Box x={xm - 0.15} y={0.2} z={h + 0.3} w={0.3} d={0.3} h={0.7} c={{ top: "#e8c3b4", left: "#dba997", right: "#c59584" }} />
    </g>
  );
}

function Pot({ x, y, c = ["#a8dcbf", "#74b39a"] }: { x: number; y: number; c?: [string, string] }) {
  const [tx, ty] = P(x + 0.12, y + 0.12, 0.42);
  return (
    <g>
      <Box x={x} y={y} w={0.24} d={0.24} h={0.22} c={{ top: "#c99a7c", left: "#e8a894", right: "#d08f7d" }} />
      <polygon points={`${tx},${ty - 12} ${tx - 9},${ty} ${tx},${ty + 4}`} fill={c[0]} />
      <polygon points={`${tx},${ty - 12} ${tx + 9},${ty} ${tx},${ty + 4}`} fill={c[1]} />
    </g>
  );
}

function Birdbath({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Box x={x - 0.05} y={y - 0.05} w={0.1} d={0.1} h={0.4} c={{ top: "#f2eef0", left: "#e2dbe0", right: "#cfc5cd" }} />
      <Box x={x - 0.2} y={y - 0.2} z={0.4} w={0.4} d={0.4} h={0.07} c={{ top: "#cfeaf2", left: "#e2dbe0", right: "#cfc5cd" }} />
    </g>
  );
}

/** Café lights strung across the yard. */
function StringLights({ dark }: { dark: number }) {
  const a = P(-0.45, 0.0, 1.85);
  const b = P(S + 0.6, 0.55, 2.1);
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 34];
  const bulbs = Array.from({ length: 11 }, (_, i) => {
    const t = (i + 0.5) / 11;
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mid[0] + t * t * b[0];
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * mid[1] + t * t * b[1];
    return [x, y + 3] as Pt;
  });
  return (
    <g>
      <path d={`M${a[0]} ${a[1]} Q${mid[0]} ${mid[1] + 34} ${b[0]} ${b[1]}`} fill="none" stroke="#8d7f99" strokeWidth={0.9} opacity={0.7} />
      {bulbs.map(([x, y], i) => (
        <g key={i}>
          {dark > 0.2 && <circle cx={x} cy={y} r={4 + dark * 4} fill="#ffe9a8" opacity={0.25 + dark * 0.35} filter="url(#glow)" />}
          <circle cx={x} cy={y} r={1.8} fill={dark > 0.2 ? "#fff3c4" : "#f6efe4"} />
        </g>
      ))}
    </g>
  );
}

const backyard: ThemeDef = {
  id: "backyard",
  name: "Backyard",
  blurb: "Raised garden beds behind the house, with lights strung over the lawn.",
  horizonY: SKY_HORIZON,
  bed: {
    soil: { top: "#c9977c", left: "#e2be96", right: "#c9a27b" },
    wet: { top: "#b5826a", left: "#e2be96", right: "#c9a27b" },
    untilled: "#d5c4a5",
    dead: { top: "#cdbfc4", left: "#d9c5ad", right: "#c1ac95" },
  },
  pathColor: "#efe8e1",
  floats: false,
  bounds: { left: -410, right: 360, top: -230, bottom: 410 },
  portraitBounds: { left: -330, right: 300, top: -230, bottom: 405 },
  Distant: (p) => <Haze {...p} tint="#d7ecc6" />,
  Ground: ({ dark, id }) => (
    <g>
      <SlabShadow {...YARD} z={-0.9} />
      <Slab
        {...YARD}
        top="#c3e1af"
        layers={[
          { h: 0.1, left: "#b2d79f", right: "#9cc78c" },
          { h: 0.5, left: "#e3c0a2", right: "#cba487" },
          { h: 0.3, left: "#e0d3dc", right: "#c7b6c4" },
        ]}
      />
      <defs>
        <clipPath id={`lawn-${id}`}>
          <polygon points={topFace(YARD.x0, YARD.y0, 0, YARD.x1 - YARD.x0, YARD.y1 - YARD.y0)} />
        </clipPath>
      </defs>
      {/* mowing stripes */}
      <g clipPath={`url(#lawn-${id})`}>
        {Array.from({ length: 14 }, (_, k) => (
          <polygon key={k} points={topFace(YARD.x0 + k * 0.7, YARD.y0, 0, 0.7, YARD.y1 - YARD.y0)} fill={dusk(k % 2 ? "#c9e6b6" : "#bfdfaa", dark, 0.4)} />
        ))}
      </g>
      {/* brick edging around the garden */}
      <polygon points={topFace(-0.1, -0.1, 0, S + 0.2, S + 0.2)} fill="#e6bfae" />
      <polygon points={topFace(0, 0, 0, S, S)} fill="#d7ecc6" />
    </g>
  ),
  Back: ({ dark }) => (
    <g>
      <House dark={dark} />
      <Fence from={[-0.45, -0.7]} to={[S + 1.15, -0.7]} h={0.75} c={["#f3e4d4", "#dbc4b0"]} />
      <RoundTree x={S + 0.7} y={0.35} s={1.1} c={["#b9dcb0", "#8dc18d"]} />
      <Pot x={-0.38} y={1.55} />
      <Pot x={-0.38} y={2.6} c={["#f6a3b8", "#de7d98"]} />
    </g>
  ),
  Front: ({ dark }) => (
    <g>
      <Birdbath x={S + 0.55} y={S - 1.3} />
      <Motes dark={dark} />
    </g>
  ),
  Lights: ({ dark }) => <StringLights dark={dark} />,
};

// ── Ocean Island ────────────────────────────────────────────────────────────

const SEA = { x0: -1.6, y0: -1.4, x1: S + 2.4, y1: S + 1.2 };
const WATER_Z = -0.34;

function PalmTree({ x, y, lean = 1, s = 1 }: { x: number; y: number; lean?: number; s?: number }) {
  const [bx, by] = P(x, y, 0);
  const top: Pt = [bx + 16 * lean * s, by - 78 * s];
  const segs = 7;
  return (
    <g>
      <ellipse cx={bx} cy={by} rx={12} ry={4} fill="#4b3a5c" opacity={0.1} />
      {Array.from({ length: segs }, (_, i) => {
        const at = (t: number): Pt => [bx + (top[0] - bx) * t * t, by + (top[1] - by) * t];
        const [ax, ay] = at(i / segs);
        const [cx, cy] = at((i + 1) / segs);
        return <line key={i} x1={ax} y1={ay} x2={cx} y2={cy} stroke={i % 2 ? "#cfa67f" : "#dcb791"} strokeWidth={4.5 - i * 0.35} strokeLinecap="round" />;
      })}
      {[-160, -120, -70, -30, 15, 60].map((a, i) => (
        <g key={i} transform={`translate(${top[0]} ${top[1]}) rotate(${a})`}>
          <polygon points="0,0 14,-6 32,4" fill={i % 2 ? "#8fcfa6" : "#a8dcbf"} />
          <polygon points="0,0 32,4 14,6" fill="#6fb592" />
        </g>
      ))}
      <circle cx={top[0] - 2} cy={top[1] + 4} r={2.6} fill="#b98f6e" />
      <circle cx={top[0] + 3} cy={top[1] + 5} r={2.4} fill="#a87e5f" />
    </g>
  );
}

function Lighthouse() {
  const x = -0.45;
  const y = -0.45;
  const segs = [
    { w: 0.62, c: { top: "#ffffff", left: "#fbf3ef", right: "#e8d9d6" } },
    { w: 0.56, c: { top: "#f7b1a6", left: "#f4a597", right: "#da8a80" } },
    { w: 0.5, c: { top: "#ffffff", left: "#fbf3ef", right: "#e8d9d6" } },
    { w: 0.44, c: { top: "#f7b1a6", left: "#f4a597", right: "#da8a80" } },
  ];
  const h = 0.62;
  return (
    <g>
      {segs.map((sg, i) => {
        const o = (0.62 - sg.w) / 2;
        return <Box key={i} x={x + o} y={y + o} z={i * h} w={sg.w} d={sg.w} h={h} c={sg.c} />;
      })}
      <Box x={x + 0.06} y={y + 0.06} z={segs.length * h} w={0.5} d={0.5} h={0.06} c={{ top: "#f3eef5", left: "#d9cfdd", right: "#c4b8c9" }} />
      <Box x={x + 0.13} y={y + 0.13} z={segs.length * h + 0.06} w={0.36} d={0.36} h={0.32} c={{ top: "#fff3c4", left: "#fff1bd", right: "#f6e2a3" }} />
      <Pyramid x={x + 0.08} y={y + 0.08} z={segs.length * h + 0.38} w={0.46} d={0.46} h={0.36} c={{ left: "#b9a0dc", right: "#9a81c4" }} />
    </g>
  );
}

const LAMP = P(-0.14, -0.14, 4 * 0.62 + 0.22);

function Pier() {
  const [bx, by] = P(S + 1.6, 3.95, WATER_Z);
  return (
    <g>
      {[0, 0.5, 1.0, 1.5].map((dx) => (
        <Box key={dx} x={S + 0.55 + dx} y={3.02} z={WATER_Z - 0.05} w={0.07} d={0.07} h={0.3} c={{ top: "#c9a28f", left: "#b98f7d", right: "#a17868" }} />
      ))}
      <Box x={S + 0.4} y={2.95} z={-0.08} w={1.85} d={0.5} h={0.06} c={{ top: "#e8cfb4", left: "#d6b796", right: "#c19f7f" }} />
      <g className="bob">
        <polygon points={`${bx - 26},${by - 4} ${bx + 18},${by - 16} ${bx + 12},${by - 6} ${bx - 18},${by + 6}`} fill="#fbf3ef" />
        <polygon points={`${bx - 18},${by + 6} ${bx + 12},${by - 6} ${bx + 10},${by} ${bx - 15},${by + 10}`} fill="#e8a49a" />
        <line x1={bx - 3} y1={by - 6} x2={bx - 3} y2={by - 44} stroke="#a17868" strokeWidth={1.4} />
        <polygon points={`${bx - 2},${by - 44} ${bx + 18},${by - 14} ${bx - 2},${by - 10}`} fill="#ffffff" />
        <polygon points={`${bx - 4},${by - 40} ${bx - 4},${by - 12} ${bx - 18},${by - 10}`} fill="#f6e9e5" />
      </g>
    </g>
  );
}

const SAND: Shades = { top: "#f7e6c6", left: "#efd5ab", right: "#e0c193" };

/** Small breaking waves on the water's surface. */
const WAVES: [number, number][] = [
  [-1.1, 0.8],
  [-1.0, 4.2],
  [S + 1.4, -0.6],
  [S + 1.9, 1.5],
  [1.6, S + 0.85],
  [S + 1.2, S + 0.7],
  [3.6, -1.0],
];

const ocean: ThemeDef = {
  id: "ocean",
  name: "Ocean Island",
  blurb: "A sandy island with palms, a pier and a lighthouse.",
  horizonY: SKY_HORIZON,
  bed: PASTEL_BED,
  pathColor: "#f8ead2",
  floats: false,
  bounds: { left: -380, right: 430, top: -230, bottom: 430 },
  portraitBounds: { left: -300, right: 330, top: -230, bottom: 425 },
  Distant: (p) => <Haze {...p} tint="#bfe6ea" />,
  Ground: ({ dark }) => (
    <g>
      <SlabShadow {...SEA} z={-1.15} />
      {/* a block of sea: you can see into the water down to the sandy floor */}
      <Slab
        {...SEA}
        z={WATER_Z}
        top={dusk("#a3dcdf", dark, 0.5)}
        layers={[
          { h: 0.06, left: "#e9f8f8", right: "#d8f0f1" },
          { h: 0.6, left: dusk("#93d3d6", dark, 0.5), right: dusk("#72bcc4", dark, 0.5) },
          { h: 0.15, left: "#ead5ab", right: "#d6bd8f" },
        ]}
      />
      {/* shallow lagoon around the island */}
      <polygon points={topFace(-1.1, -1.1, WATER_Z, S + 2.2, S + 2.2)} fill="#c5f0ea" opacity={0.6} />
      <Box x={-0.55} y={-0.55} z={WATER_Z - 0.02} w={S + 1.1} d={S + 1.1} h={0.3} c={SAND} />
      <polyline
        points={pts(P(-0.55, S + 0.55, WATER_Z), P(S + 0.55, S + 0.55, WATER_Z), P(S + 0.55, -0.55, WATER_Z))}
        fill="none"
        stroke="#ffffff"
        strokeWidth={3}
        strokeLinejoin="round"
        className="foam"
      />
      <Box x={0} y={0} z={-0.06} w={S} d={S} h={0.06} c={{ top: GRASS.top, left: GRASS.left, right: GRASS.right }} />
      {/* rocks in the shallows */}
      <Box x={-1.0} y={S - 0.4} z={WATER_Z - 0.06} w={0.3} d={0.25} h={0.18} c={{ top: "#e2dbe6", left: "#cfc5d6", right: "#b8adc2" }} />
      <Box x={-0.85} y={S - 0.05} z={WATER_Z - 0.06} w={0.18} d={0.16} h={0.1} c={{ top: "#e2dbe6", left: "#cfc5d6", right: "#b8adc2" }} />
      {/* glints and waves on the surface */}
      <g className="waves" stroke="#ffffff" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.7}>
        {WAVES.map(([gx, gy], i) => {
          const [x, y] = P(gx, gy, WATER_Z);
          return <path key={i} d={`M${x - 14} ${y} q7 -4 14 0 t14 0`} style={{ animationDelay: `${i * 0.7}s` }} />;
        })}
      </g>
    </g>
  ),
  Back: () => (
    <g>
      <Lighthouse />
      <PalmTree x={-0.25} y={2.4} lean={-1} />
      <PalmTree x={2.3} y={-0.3} lean={1} s={0.85} />
      <Lantern x={S - 0.3} y={0.3} />
    </g>
  ),
  Front: ({ dark }) => (
    <g>
      <Pier />
      <PalmTree x={0.9} y={S + 0.3} lean={-1} s={0.85} />
      <Motes dark={dark} />
    </g>
  ),
  Lights: ({ dark }) => (
    <g>
      <LanternLight x={S - 0.3} y={0.3} dark={dark} />
      {dark > 0.3 && (
        <g className="beam" opacity={dark}>
          <polygon points={`${LAMP[0]},${LAMP[1]} ${LAMP[0] - 420},${LAMP[1] - 60} ${LAMP[0] - 420},${LAMP[1] + 10}`} fill="#fff3c4" opacity={0.22} />
          <polygon points={`${LAMP[0]},${LAMP[1]} ${LAMP[0] + 420},${LAMP[1] - 40} ${LAMP[0] + 420},${LAMP[1] + 30}`} fill="#fff3c4" opacity={0.16} />
        </g>
      )}
      <Glow at={LAMP} dark={dark} r={4} />
    </g>
  ),
};

export const THEMES: Record<ThemeId, ThemeDef> = { floating, farm, backyard, ocean };
export const THEME_IDS: ThemeId[] = ["floating", "farm", "backyard", "ocean"];

export function themeFor(id: ThemeId | undefined | null): ThemeDef {
  return (id && THEMES[id]) || floating;
}
