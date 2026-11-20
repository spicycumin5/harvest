import type { ReactNode } from "react";
import type { CropType, Stage } from "../game/crops";

/**
 * Low-poly, flat-shaded crops. Drawn in a 100×100 box with the ground point at (50, 80).
 * Every shape is split into a light half (facing the light, upper-left) and a shaded half.
 */

const STEM = "#7fb59a";
const LEAF: Duo = ["#a8dcbf", "#74b39a"];
const WILT: Duo = ["#d4c8d6", "#b3a4b9"];

type Duo = [light: string, dark: string];

const PAL: Record<string, Duo> = {
  carrot: ["#f8b08c", "#e5876b"],
  petal: ["#f9dc8a", "#ecb963"],
  disc: ["#a07d98", "#7d5f7c"],
  berry: ["#f59aa8", "#d9728a"],
  blossom: ["#fffaf5", "#eadfe4"],
  pumpkin: ["#f9bf8c", "#e69a6c"],
  pumpkinMid: ["#f4ad7a", "#f4ad7a"],
  lavBud: ["#dcd0f5", "#c2b2ea"],
  lavRipe: ["#bba6ec", "#957fd6"],
  wheatGreen: ["#cfe5b0", "#aecb8e"],
  wheatGold: ["#f6dc98", "#dfba6e"],
  soil: ["#e8b9a3", "#cf9a88"],
  seed: ["#fff4cf", "#f6dc98"],
};

/** A diamond leaf from (x,y) along `angle`, split along its midrib. */
function Leaf({ x, y, angle, len, w = len * 0.32, c = LEAF }: { x: number; y: number; angle: number; len: number; w?: number; c?: Duo }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <polygon points={`0,0 ${len * 0.45},${-w} ${len},0`} fill={c[0]} />
      <polygon points={`0,0 ${len * 0.45},${w} ${len},0`} fill={c[1]} />
    </g>
  );
}

/** A faceted hexagonal "gem": light left half, shaded right half. */
function Gem({ x, y, r, c, ry = r * 0.9 }: { x: number; y: number; r: number; c: Duo; ry?: number }) {
  const h = r / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points={`0,${-ry} ${-r},${-ry / 2} ${-r},${ry / 2} 0,${ry}`} fill={c[0]} />
      <polygon points={`0,${-ry} ${r},${-ry / 2} ${r},${ry / 2} 0,${ry}`} fill={c[1]} />
      <polygon points={`0,${-ry} ${-h},${-ry / 2} 0,${-ry / 4} ${h},${-ry / 2}`} fill="#ffffff" opacity={0.18} />
    </g>
  );
}

function Stem({ to, bend = 0, color = STEM, width = 2.4 }: { to: number; bend?: number; color?: string; width?: number }) {
  return <path d={`M50 80 Q ${50 + bend} ${(80 + to) / 2} 50 ${to}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

function Seed() {
  return (
    <g>
      <polygon points="38,80 50,74 62,80 50,86" fill={PAL.soil[0]} />
      <polygon points="38,80 50,86 62,80 50,82" fill={PAL.soil[1]} />
      {[
        [45, 79],
        [53, 78],
        [50, 81.5],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill={PAL.seed[0]} filter="url(#glow-soft)" />
      ))}
    </g>
  );
}

function Sprout() {
  return (
    <g>
      <Stem to={66} />
      <Leaf x={50} y={67} angle={-150} len={13} />
      <Leaf x={50} y={67} angle={-30} len={13} />
    </g>
  );
}

function Young({ top = 46 }: { top?: number }) {
  return (
    <g>
      <Stem to={top} bend={-2} />
      <Leaf x={50} y={73} angle={-165} len={16} />
      <Leaf x={50} y={69} angle={-15} len={16} />
      <Leaf x={50} y={59} angle={-148} len={13} />
      <Leaf x={50} y={55} angle={-32} len={13} />
      <Leaf x={50} y={top + 1} angle={-112} len={9} />
      <Leaf x={50} y={top + 1} angle={-68} len={9} />
    </g>
  );
}

// ── mature stages ───────────────────────────────────────────────────────────

function Fronds({ count }: { count: number }) {
  const spread = 120;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = -90 - spread / 2 + (spread / (count - 1)) * i;
        const r = (a * Math.PI) / 180;
        const x = 50 + Math.cos(r) * 22;
        const y = 79 + Math.sin(r) * 26;
        return (
          <g key={i}>
            <line x1={50} y1={79} x2={x} y2={y} stroke={STEM} strokeWidth={1.8} strokeLinecap="round" />
            <Leaf x={x} y={y} angle={a} len={11} w={4} />
          </g>
        );
      })}
    </g>
  );
}

function Carrot({ stage }: { stage: Stage }) {
  if (stage === "bloom") return <Fronds count={5} />;
  return (
    <g>
      <Fronds count={7} />
      <polygon points="42,78 50,78 50,97" fill={PAL.carrot[0]} />
      <polygon points="50,78 58,78 50,97" fill={PAL.carrot[1]} />
      <polygon points="42,78 50,74 58,78 50,80" fill={PAL.carrot[0]} />
    </g>
  );
}

function Sunflower({ stage }: { stage: Stage }) {
  const ripe = stage === "ripe";
  return (
    <g>
      <Stem to={31} bend={-3} width={2.8} />
      <Leaf x={50} y={70} angle={-170} len={20} />
      <Leaf x={50} y={63} angle={-10} len={20} />
      <Leaf x={50} y={49} angle={-155} len={15} />
      <Leaf x={50} y={45} angle={-25} len={15} />
      {ripe ? (
        <g transform="translate(50 29)">
          {Array.from({ length: 10 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 36})`}>
              <polygon points="-3.6,-7 0,-17 0,-7" fill={PAL.petal[0]} />
              <polygon points="0,-7 0,-17 3.6,-7" fill={PAL.petal[1]} />
            </g>
          ))}
          <Gem x={0} y={0} r={8} c={PAL.disc} />
        </g>
      ) : (
        <g>
          {[-40, 0, 40].map((a) => (
            <polygon key={a} points="47,29 50,20 53,29" fill={PAL.petal[0]} transform={`rotate(${a} 50 31)`} />
          ))}
          <Gem x={50} y={31} r={5} c={LEAF} />
        </g>
      )}
    </g>
  );
}

function Berry({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points="-4.5,-3 0,-3 0,6" fill={PAL.berry[0]} />
      <polygon points="0,-3 4.5,-3 0,6" fill={PAL.berry[1]} />
      <polygon points="-3.5,-3 0,-6 3.5,-3" fill={LEAF[1]} />
    </g>
  );
}

function Strawberry({ stage }: { stage: Stage }) {
  return (
    <g>
      <Gem x={39} y={73} r={9} c={LEAF} ry={7} />
      <Gem x={61} y={73} r={9} c={LEAF} ry={7} />
      <Gem x={50} y={66} r={10} c={LEAF} ry={8} />
      {stage === "bloom" ? (
        <>
          {[
            [41, 69],
            [58, 66],
            [52, 74],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={2.6} fill={PAL.blossom[0]} />
              <circle cx={x} cy={y} r={1} fill={PAL.petal[1]} />
            </g>
          ))}
        </>
      ) : (
        <>
          <Berry x={38} y={77} />
          <Berry x={61} y={76} />
          <Berry x={50} y={79} />
        </>
      )}
    </g>
  );
}

function Pumpkin({ stage }: { stage: Stage }) {
  return (
    <g>
      <path d="M24 80 Q36 72 50 78 Q64 84 76 74" fill="none" stroke={STEM} strokeWidth={2.2} strokeLinecap="round" />
      <Gem x={28} y={76} r={8} ry={5} c={LEAF} />
      <Gem x={72} y={74} r={8} ry={5} c={LEAF} />
      {stage === "bloom" ? (
        <g>
          <Gem x={48} y={74} r={9} ry={6} c={LEAF} />
          <g transform="translate(50 62)">
            {Array.from({ length: 5 }, (_, i) => (
              <polygon key={i} points="-2.4,0 0,-7 2.4,0" fill={i % 2 ? PAL.petal[1] : PAL.petal[0]} transform={`rotate(${i * 72})`} />
            ))}
          </g>
        </g>
      ) : (
        <g transform="translate(50 70)">
          <polygon points="-15,-4 -9,-10 -4,-10 -4,10 -9,10 -15,4" fill={PAL.pumpkin[0]} />
          <polygon points="-4,-10 4,-10 4,10 -4,10" fill={PAL.pumpkinMid[0]} />
          <polygon points="4,-10 9,-10 15,-4 15,4 9,10 4,10" fill={PAL.pumpkin[1]} />
          <polygon points="-1,-10 1,-10 3,-16 1,-16" fill={STEM} />
        </g>
      )}
    </g>
  );
}

function Lavender({ stage }: { stage: Stage }) {
  const c = stage === "bloom" ? PAL.lavBud : PAL.lavRipe;
  const buds = stage === "bloom" ? 3 : 6;
  return (
    <g>
      <Leaf x={50} y={79} angle={-162} len={16} />
      <Leaf x={50} y={79} angle={-18} len={16} />
      {[-26, -13, 0, 13, 26].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const len = i === 2 ? 54 : 48;
        const tx = 50 + Math.sin(r) * len;
        const ty = 80 - Math.cos(r) * len;
        return (
          <g key={a}>
            <line x1={50} y1={79} x2={tx} y2={ty} stroke={STEM} strokeWidth={1.6} strokeLinecap="round" />
            <g transform={`translate(${tx} ${ty}) rotate(${a})`}>
              {Array.from({ length: buds }, (_, j) => (
                <g key={j} transform={`translate(0 ${j * 4})`}>
                  <polygon points="-2.4,0 0,-3 0,3" fill={c[0]} />
                  <polygon points="0,-3 2.4,0 0,3" fill={c[1]} />
                </g>
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
}

function Wheat({ stage }: { stage: Stage }) {
  const c = stage === "bloom" ? PAL.wheatGreen : PAL.wheatGold;
  return (
    <g>
      {[-15, -5, 5, 15].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const tx = 50 + Math.sin(r) * 52;
        const ty = 80 - Math.cos(r) * 54;
        return (
          <g key={a}>
            <line x1={47 + i * 2} y1={80} x2={tx} y2={ty + 10} stroke={stage === "ripe" ? "#d8c08a" : STEM} strokeWidth={1.6} strokeLinecap="round" />
            <g transform={`translate(${tx} ${ty}) rotate(${a})`}>
              {[0, 4.5, 9].map((y) => (
                <g key={y}>
                  <polygon points={`-4,${y + 1} -1,${y - 3} 0,${y + 2}`} fill={c[0]} />
                  <polygon points={`4,${y + 1} 1,${y - 3} 0,${y + 2}`} fill={c[1]} />
                </g>
              ))}
              {stage === "ripe" && <line x1={0} y1={-2} x2={0} y2={-9} stroke={c[1]} strokeWidth={0.9} />}
            </g>
          </g>
        );
      })}
      <Leaf x={48} y={75} angle={-150} len={15} />
      <Leaf x={52} y={71} angle={-30} len={15} />
    </g>
  );
}

const MATURE: Record<CropType, (p: { stage: Stage }) => ReactNode> = {
  carrot: Carrot,
  sunflower: Sunflower,
  strawberry: Strawberry,
  pumpkin: Pumpkin,
  lavender: Lavender,
  wheat: Wheat,
};

function Withered() {
  return (
    <g>
      <path d="M50 80 Q49 62 56 55 Q62 50 67 57" fill="none" stroke="#b3a4b9" strokeWidth={2.4} strokeLinecap="round" />
      <Leaf x={50} y={72} angle={160} len={13} c={WILT} />
      <Leaf x={51} y={66} angle={28} len={12} c={WILT} />
      <Leaf x={66} y={56} angle={82} len={10} c={WILT} />
      <Leaf x={38} y={81} angle={-8} len={8} w={2} c={WILT} />
    </g>
  );
}

export interface CropProps {
  type: CropType;
  stage: Stage;
  /** 0 healthy, 1 a little droopy, 2 very droopy */
  droop?: number;
  dead?: boolean;
}

export function CropArt({ type, stage, droop = 0, dead }: CropProps) {
  if (dead) return <Withered />;
  let art: ReactNode = null;
  if (stage === "seed") art = <Seed />;
  else if (stage === "sprout") art = <Sprout />;
  else if (stage === "young") art = <Young top={type === "sunflower" ? 38 : 46} />;
  else if (stage === "bloom" || stage === "ripe") {
    const Mature = MATURE[type];
    art = <Mature stage={stage} />;
  }
  if (!art) return null;
  const lean = droop === 0 ? 0 : droop === 1 ? 6 : 13;
  return (
    <g transform={`rotate(${lean} 50 80)`} style={{ filter: droop ? `saturate(${droop === 1 ? 0.7 : 0.4})` : undefined }}>
      {art}
    </g>
  );
}

/** A crop on a small floating tile, for pickers, lists and the pantry. */
export function CropIcon({ type, stage = "ripe", size = 64 }: { type: CropType; stage?: Stage; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <polygon points="22,82 50,68 78,82 50,96" fill="#f3d2c4" />
      <polygon points="22,82 50,96 50,99 22,85" fill="#e6b6a6" />
      <polygon points="78,82 50,96 50,99 78,85" fill="#d49d92" />
      <CropArt type={type} stage={stage} />
    </svg>
  );
}
