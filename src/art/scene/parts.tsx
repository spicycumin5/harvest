import { Box, P, Pyramid, pts, topFace, type Pt } from "../iso";
import { mixHex } from "../../lib/sky";
import { HOME, lane, type GridPt } from "./layout";

/** Tint a colour toward night blue as it gets dark. */
export const dusk = (c: string, dark: number, amount = 0.45) => mixHex(c, "#3a4078", dark * amount);

/** Walkways between the plots and out to the home stone. */
export function Paths({ color }: { color: string }) {
  return (
    <g fill={color} opacity={0.9}>
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <polygon points={topFace(lane(k) - 0.11, lane(0), 0, 0.22, lane(3) - lane(0))} />
          <polygon points={topFace(lane(0), lane(k) - 0.11, 0, lane(3) - lane(0), 0.22)} />
        </g>
      ))}
      <polygon points={topFace(lane(3) - 0.11, lane(3), 0, 0.22, HOME[1] - lane(3))} />
      <polygon points={topFace(lane(3), HOME[1] - 0.11, 0, HOME[0] - lane(3), 0.22)} />
    </g>
  );
}

export function HomeStone() {
  const [hx, hy] = HOME;
  return (
    <g>
      <Box x={hx - 0.22} y={hy - 0.22} w={0.44} d={0.44} h={0.05} c={{ top: "#fff6ee", left: "#f0dcd6", right: "#dcc0c2" }} />
      <polygon points={topFace(hx - 0.12, hy - 0.12, 0.051, 0.24, 0.24)} fill="#fff3c4" opacity={0.7} filter="url(#glow-soft)" />
    </g>
  );
}

/** A geometric pine: two stacked pyramids on a little trunk. */
export function PineTree({ x, y, s = 1, light = "#a5d8be", dark = "#7fbca3" }: { x: number; y: number; s?: number; light?: string; dark?: string }) {
  return (
    <g>
      <Box x={x - 0.04} y={y - 0.04} w={0.08} d={0.08} h={0.35 * s} c={{ top: "#c9a28f", left: "#b98f7d", right: "#a17868" }} />
      <Pyramid x={x - 0.3 * s} y={y - 0.3 * s} z={0.25 * s} w={0.6 * s} d={0.6 * s} h={0.8 * s} c={{ left: light, right: dark }} />
      <Pyramid x={x - 0.22 * s} y={y - 0.22 * s} z={0.6 * s} w={0.44 * s} d={0.44 * s} h={0.7 * s} c={{ left: mixHex(light, "#ffffff", 0.15), right: mixHex(dark, "#ffffff", 0.1) }} />
    </g>
  );
}

/** A rounded, faceted broadleaf tree. */
export function RoundTree({ x, y, s = 1, c = ["#b2dbb6", "#86bf96"] }: { x: number; y: number; s?: number; c?: [string, string] }) {
  const [bx, by] = P(x, y, 0);
  const [tx, ty] = P(x, y, 1.15 * s);
  const r = 26 * s;
  return (
    <g>
      <Box x={x - 0.05} y={y - 0.05} w={0.1} d={0.1} h={0.8 * s} c={{ top: "#c9a28f", left: "#b98f7d", right: "#a17868" }} />
      <ellipse cx={bx} cy={by} rx={r * 0.8} ry={r * 0.32} fill="#4b3a5c" opacity={0.08} />
      <g transform={`translate(${tx} ${ty})`}>
        <polygon points={`0,${-r} ${-r},${-r * 0.35} ${-r * 0.8},${r * 0.5} 0,${r * 0.8}`} fill={c[0]} />
        <polygon points={`0,${-r} ${r},${-r * 0.35} ${r * 0.8},${r * 0.5} 0,${r * 0.8}`} fill={c[1]} />
        <polygon points={`0,${-r} ${-r * 0.5},${-r * 0.55} 0,${-r * 0.2} ${r * 0.5},${-r * 0.55}`} fill="#ffffff" opacity={0.18} />
      </g>
    </g>
  );
}

export function Lantern({ x, y }: { x: number; y: number }) {
  return <Box x={x - 0.035} y={y - 0.035} w={0.07} d={0.07} h={0.62} c={{ top: "#efe0ea", left: "#d9c3d4", right: "#bea3bb" }} />;
}

/** A glowing light at a point; brighter at night. */
export function Glow({ at, dark, r = 3.2, color = "#fff1b8" }: { at: Pt; dark: number; r?: number; color?: string }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={r * 2.5 + dark * r * 2.5} fill={color} opacity={0.3 + dark * 0.25} filter="url(#glow)" />
      <circle cx={at[0]} cy={at[1]} r={r} fill="#fff6d2" />
    </g>
  );
}

export function LanternLight({ x, y, dark }: { x: number; y: number; dark: number }) {
  return <Glow at={P(x, y, 0.7)} dark={dark} />;
}

/** A run of fence between two grid points. */
export function Fence({ from, to, h = 0.4, c = ["#f3e2d2", "#d9bfae"] }: { from: GridPt; to: GridPt; h?: number; c?: [string, string] }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(2, Math.round(len / 0.45) + 1);
  const posts = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as GridPt;
  });
  const rail = (z: number) => {
    const a = P(from[0], from[1], z);
    const b = P(to[0], to[1], z);
    return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c[1]} strokeWidth={2} strokeLinecap="round" />;
  };
  return (
    <g>
      {rail(h * 0.45)}
      {rail(h * 0.85)}
      {posts.map(([px, py], i) => (
        <Box key={i} x={px - 0.035} y={py - 0.035} w={0.07} d={0.07} h={h} c={{ top: "#fffaf3", left: c[0], right: c[1] }} />
      ))}
    </g>
  );
}

export function CloudSea({ layer, dark }: { layer: "back" | "front"; dark: number }) {
  const fill = mixHex("#fffaf8", "#a9a3cf", dark);
  const blobs: [number, number, number, number][] =
    layer === "back"
      ? [[-1100, 420, 260, 50], [-760, 410, 220, 46], [-420, 410, 160, 40], [-200, 400, 190, 46], [60, 395, 200, 44], [320, 405, 180, 42], [640, 412, 230, 48], [980, 418, 260, 50], [-480, 470, 220, 60], [480, 470, 220, 60]]
      : [[-1000, 520, 300, 70], [-640, 530, 260, 60], [-340, 500, 240, 60], [-60, 520, 260, 60], [250, 505, 250, 62], [560, 530, 240, 56], [900, 520, 300, 70], [-60, 700, 1400, 200]];
  return (
    <g className={`cloudsea cloudsea-${layer}`} filter="url(#cloud-blur)" opacity={layer === "back" ? 0.75 : 0.95}>
      {blobs.map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      ))}
    </g>
  );
}

/** A distant floating islet, small and hazy. */
export function Islet({ x, y, s, dark }: { x: number; y: number; s: number; dark: number }) {
  const k = 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.55 - dark * 0.1} className="islet">
      <polygon points={topFace(0, 0, 0, k, k)} fill="#ffffff" opacity={0.75} />
      <polygon points={pts(P(0, k, 0), P(k, k, 0), P(k / 2, k / 2, -3.2))} fill="#f4dde6" />
      <polygon points={pts(P(k, 0, 0), P(k, k, 0), P(k / 2, k / 2, -3.2))} fill="#e3c4d6" />
      <Box x={1.2} y={1.2} w={0.5} d={0.5} h={1.8} c={{ top: "#ffffff", left: "#f6e6ee", right: "#e6cfe0" }} />
    </g>
  );
}

const MOTES: [number, number, number][] = [
  [-300, 120, 0], [-180, 60, 1.2], [-90, 220, 2.6], [20, 30, 3.4], [140, 180, 0.8], [260, 90, 2.1],
  [330, 250, 4.2], [-380, 260, 3.1], [70, 300, 1.7], [-230, 330, 5.0], [200, 340, 4.6], [-40, 140, 5.6],
];

/** Drifting specks of light by day; fireflies by night. */
export function Motes({ dark }: { dark: number }) {
  const night = dark > 0.5;
  return (
    <g aria-hidden="true">
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
