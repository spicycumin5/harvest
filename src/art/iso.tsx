/**
 * Isometric geometry. Grid units: +x runs down-right, +y runs down-left, +z is up.
 * Everything is flat-shaded: light comes from the upper left, so for any box the
 * top is lightest, the left (front-left) face is mid, the right (front-right) face darkest.
 */

export const U = 56; // screen px per grid unit
const COS30 = 0.866;

export type Pt = [number, number];

export function P(gx: number, gy: number, gz = 0): Pt {
  return [(gx - gy) * U * COS30, (gx + gy) * U * 0.5 - gz * U];
}

export function pts(...ps: Pt[]): string {
  return ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export interface Shades {
  top: string;
  left: string;
  right: string;
}

/** A box at (x,y,z) with footprint w×d and height h. Only the three visible faces are drawn. */
export function Box({ x, y, z = 0, w, d, h, c }: { x: number; y: number; z?: number; w: number; d: number; h: number; c: Shades }) {
  const t = z + h;
  return (
    <g>
      <polygon points={pts(P(x, y + d, t), P(x + w, y + d, t), P(x + w, y + d, z), P(x, y + d, z))} fill={c.left} />
      <polygon points={pts(P(x + w, y, t), P(x + w, y + d, t), P(x + w, y + d, z), P(x + w, y, z))} fill={c.right} />
      <polygon points={pts(P(x, y, t), P(x + w, y, t), P(x + w, y + d, t), P(x, y + d, t))} fill={c.top} />
    </g>
  );
}

/** A four-sided pyramid roof sitting on a w×d footprint at height z. */
export function Pyramid({ x, y, z, w, d, h, c }: { x: number; y: number; z: number; w: number; d: number; h: number; c: Omit<Shades, "top"> }) {
  const apex = P(x + w / 2, y + d / 2, z + h);
  return (
    <g>
      <polygon points={pts(P(x, y + d, z), P(x + w, y + d, z), apex)} fill={c.left} />
      <polygon points={pts(P(x + w, y, z), P(x + w, y + d, z), apex)} fill={c.right} />
    </g>
  );
}

/** Top face polygon of a 1×1 tile (or any rect) at height z. */
export function topFace(x: number, y: number, z: number, w = 1, d = 1): string {
  return pts(P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z));
}

/** Mix a hex colour toward another (t = 0..1). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return "#" + [m(16), m(8), m(0)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
