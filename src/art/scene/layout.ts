/** The plot grid, paths and walking routes. Every theme shares this layout. */

export type GridPt = [number, number];

export const M = 0.6; // margin around the plots
export const G = 0.36; // path between plots
export const STEP = 1 + G;
export const ISLAND = 2 * M + 3 + 2 * G; // edge length of the farm square
export const TILE_H = 0.14;

export function plotOrigin(index: number): GridPt {
  return [M + (index % 3) * STEP, M + Math.floor(index / 3) * STEP];
}

/** Centre line of the k-th path (0..3). */
export const lane = (k: number) => M + k * STEP - G / 2;

export const HOME: GridPt = [ISLAND - 0.36, ISLAND - 0.36];

/** Walk from home along the paths to stand in front of a plot. */
export function routeTo(index: number): GridPt[] {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const frontLane = lane(row + 1);
  const stand: GridPt = [M + col * STEP + 0.62, frontLane];
  return [HOME, [lane(3), HOME[1]], [lane(3), frontLane], stand];
}

const SPEED = 2.6; // grid units per second

export function walkSeconds(path: GridPt[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return total / SPEED;
}
