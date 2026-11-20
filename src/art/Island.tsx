import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { P } from "./iso";
import { Wanderer, type FarmerPose } from "./Farmer";
import type { CropType } from "../game/crops";
import type { PlotState } from "../game/engine";
import type { SkyState } from "../lib/sky";
import type { ThemeId } from "../data/types";
import { HOME, plotOrigin, type GridPt } from "./scene/layout";
import { SkyLayer } from "./scene/SkyLayer";
import { EmptyTile, PlotLabel, Tile, type TileEffect } from "./scene/Tile";
import { HomeStone, Paths } from "./scene/parts";
import { themeFor, type Bounds } from "./scene/themes";

export { HOME, ISLAND, plotOrigin, routeTo, walkSeconds, type GridPt } from "./scene/layout";
export type { TileEffect, EffectAction } from "./scene/Tile";

export interface IslandPlot {
  index: number;
  name: string;
  crop: CropType;
  state: PlotState;
}

export interface FarmerMotion {
  pose: FarmerPose;
  /** Grid points to walk through; the last one is where the wanderer ends up. */
  path: GridPt[];
  /** Change to restart the walk. */
  key: number;
}

interface IslandProps {
  sky: SkyState;
  theme?: ThemeId;
  plots: IslandPlot[];
  farmer?: FarmerMotion;
  /** A job animation playing on one plot. */
  effect?: { index: number } & TileEffect;
  showEmpty?: boolean;
  /** Pin each habit's name below its plot. */
  showLabels?: boolean;
  onSelectPlot?: (index: number) => void;
  onSelectEmpty?: (index: number) => void;
  selected?: number | null;
  className?: string;
  /** Screen pixels to keep clear on each side (for overlaid UI). */
  insetTop?: number;
  insetBottom?: number;
  insetRight?: number;
}

const MAX_SCALE = 1.15;

/** Fits the farm into a container of any shape, keeping the requested insets clear. */
function fitViewBox(w: number, h: number, insets: { top: number; bottom: number; right: number }, bounds: Bounds, portraitBounds: Bounds) {
  const freeW = Math.max(120, w - insets.right);
  const freeH = Math.max(120, h - insets.top - insets.bottom);
  const portrait = freeW < freeH;
  const b = portrait ? portraitBounds : bounds;
  const bw = b.right - b.left;
  const bh = b.bottom - b.top;
  const s = Math.min(MAX_SCALE, (freeW * (portrait ? 1 : 0.94)) / bw, freeH / bh);
  // centre the farm within the free area
  const x = (b.left + b.right) / 2 - freeW / s / 2;
  const y = b.top - insets.top / s - (freeH / s - bh) / 2;
  return { x, y, w: w / s, h: h / s, s };
}

function useSize<T extends Element>(): [RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 1000, h: 700 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

const WALK_SPEED = 2.6; // grid units per second, matching walkSeconds()

/**
 * Moves the wanderer along its path one frame at a time, turning to face each leg
 * of the walk. A new `key` starts a new walk from the path's first point.
 */
function useWalk(farmer: FarmerMotion | undefined) {
  const ref = useRef<SVGGElement>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const path = farmer?.path.length ? farmer.path : [HOME];
  const key = farmer?.key ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pts = path.map(([gx, gy]) => P(gx, gy, 0));
    const place = ([x, y]: [number, number]) => el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const legs: { from: number; len: number }[] = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const len = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      legs.push({ from: total, len });
      total += len;
    }
    const face = (i: number) => {
      const dx = pts[i + 1][0] - pts[i][0];
      if (Math.abs(dx) > 0.5) setFacing(dx < 0 ? -1 : 1);
    };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (total === 0 || reduce) {
      place(pts[pts.length - 1]);
      if (pts.length > 1) face(pts.length - 2);
      return;
    }
    place(pts[0]);
    face(0);
    let leg = 0;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const d = Math.min(total, ((now - start) / 1000) * WALK_SPEED);
      while (leg < legs.length - 1 && d > legs[leg].from + legs[leg].len) {
        leg++;
        face(leg);
      }
      const { from, len } = legs[leg];
      const t = len ? (d - from) / len : 1;
      const a = pts[leg];
      const b = pts[leg + 1];
      place([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      if (d < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ref, facing };
}

export function IslandScene({
  sky,
  theme: themeId,
  plots,
  farmer,
  effect,
  showEmpty,
  showLabels,
  onSelectPlot,
  onSelectEmpty,
  selected,
  className,
  insetTop = 0,
  insetBottom = 0,
  insetRight = 0,
}: IslandProps) {
  const theme = themeFor(themeId);
  const dark = sky.dark;
  const id = useId().replace(/:/g, "");
  const [ref, size] = useSize<SVGSVGElement>();
  const vb = fitViewBox(size.w, size.h, { top: insetTop, bottom: insetBottom, right: insetRight }, theme.bounds, theme.portraitBounds);
  const span = Math.min(380, vb.w * 0.42);
  const byIndex = new Map(plots.map((p) => [p.index, p]));
  const sceneProps = { sky, dark, span, id };
  const { Distant, Ground, Back, Front, Lights } = theme;
  const shade = dark > 0 ? { filter: `brightness(${1 - dark * 0.18}) saturate(${1 - dark * 0.15}) hue-rotate(${-dark * 6}deg)` } : undefined;

  const { ref: walkerRef, facing } = useWalk(farmer);

  function keyHandler(fn?: () => void) {
    return (e: KeyboardEvent) => {
      if (fn && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        fn();
      }
    };
  }

  // Labels shrink with the scene; hide them when they'd be too small to read.
  const labels = showLabels && vb.s >= 0.72;

  return (
    <svg
      ref={ref}
      viewBox={`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`}
      className={`island-scene theme-${theme.id} ${className ?? ""}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`Your farm: ${theme.name}`}
    >
      <SkyLayer sky={sky} id={id} span={span} horizonY={theme.horizonY} />
      <Distant {...sceneProps} />
      <g className={theme.floats ? "island-float" : undefined}>
        <g className="island-shade" style={shade}>
          <Ground {...sceneProps} />
          <Paths color={theme.pathColor} />
          <Back {...sceneProps} />
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
                <Tile
                  x={x}
                  y={y}
                  crop={p.crop}
                  state={p.state}
                  bed={theme.bed}
                  effect={effect?.index === i ? effect : undefined}
                />
              </g>
            );
          })}
        </g>
        <Lights {...sceneProps} />
        <g ref={walkerRef}>
          <Wanderer pose={farmer?.pose ?? "idle"} facing={facing} />
        </g>
        <g className="island-shade" style={shade}>
          <Front {...sceneProps} />
        </g>
        {plots.map((p) => {
          if (!labels && selected !== p.index) return null;
          const [x, y] = plotOrigin(p.index);
          return <PlotLabel key={p.index} x={x} y={y} text={p.name} selected={selected === p.index} />;
        })}
      </g>
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
