import type { FarmerAction } from "../game/engine";

export type FarmerPose = FarmerAction | "idle" | "walk" | "wave";

const CLOAK: [string, string] = ["#f2917f", "#cf6b6f"];
const HOOD = "#b85a66";
const SKIN: [string, string] = ["#fbeee4", "#ecd5cb"];
const LIGHT = "#fff3c4";

/**
 * The wanderer who tends the farm: a small cloaked figure with no face, carrying a light.
 * Drawn as an SVG group with the feet at (0, 0), about 40px tall. `facing` flips it.
 */
export function Wanderer({ pose = "idle", facing = 1 }: { pose?: FarmerPose; facing?: 1 | -1 }) {
  const lean = pose === "weed" ? 18 : pose === "plant" || pose === "replant" ? 11 : 0;
  return (
    <g className={`wanderer pose-${pose}`}>
      <ellipse cx={0} cy={0} rx={8} ry={2.8} fill="#4b3a5c" opacity={0.18} />
      <g transform={`scale(${facing} 1)`}>
        <g className="wanderer-body">
          <g transform={`rotate(${lean} 0 0)`} style={{ transition: "transform .4s" }}>
            {/* cloak */}
            <polygon points="-9,0 0,0 0,-25 -4.5,-25" fill={CLOAK[0]} />
            <polygon points="0,0 9,0 4.5,-25 0,-25" fill={CLOAK[1]} />
            <polygon className="cape-tail" points="-9,0 -14,-2 -6,-14" fill={CLOAK[1]} opacity={0.9} />
            {/* head: no face, just light and shade */}
            <circle cx={0} cy={-29.5} r={5.4} fill={SKIN[0]} />
            <path d="M0 -35 A5.4 5.4 0 0 1 0 -24.1 Z" fill={SKIN[1]} />
            {/* hood */}
            <path d="M-6.2 -27 Q-6.8 -36.5 0 -37 Q6.8 -36.5 6.2 -27 Q4.6 -33 0 -33.4 Q-4.6 -33 -6.2 -27 Z" fill={HOOD} />
            <polygon points="-1,-36.6 -7,-41 1.8,-36.8" fill={HOOD} />
            <Held pose={pose} />
          </g>
        </g>
      </g>
    </g>
  );
}

function Orb({ x, y, r = 2.6, pulse }: { x: number; y: number; r?: number; pulse?: boolean }) {
  return (
    <g className={pulse ? "orb pulse" : "orb"}>
      <circle cx={x} cy={y} r={r * 3} fill={LIGHT} opacity={0.35} filter="url(#glow)" />
      <circle cx={x} cy={y} r={r} fill={LIGHT} />
    </g>
  );
}

function Held({ pose }: { pose: FarmerPose }) {
  switch (pose) {
    case "water":
      return (
        <g>
          <Orb x={12} y={-22} r={3} />
          <g className="falling" fill="#cfeefa">
            <circle cx={13} cy={-14} r={1.3} />
            <circle cx={10} cy={-10} r={1.1} />
            <circle cx={15} cy={-8} r={1.2} />
          </g>
        </g>
      );
    case "plant":
    case "replant":
      return (
        <g>
          <Orb x={9} y={-13} r={2.2} />
          <g className="falling" fill={LIGHT}>
            <circle cx={10} cy={-8} r={1.2} />
            <circle cx={13} cy={-5} r={1.1} />
            <circle cx={8} cy={-3} r={1.1} />
          </g>
        </g>
      );
    case "weed":
      return (
        <g className="tug">
          <polygon points="8,-8 10,-18 11,-8" fill="#74b39a" />
          <polygon points="9,-8 5,-16 11,-8" fill="#a8dcbf" />
          <polygon points="10,-8 15,-15 11,-8" fill="#74b39a" />
        </g>
      );
    case "harvest":
      return (
        <g>
          <polygon points="4,-12 14,-12 12,-4 6,-4" fill="#e9b89a" />
          <polygon points="9,-12 14,-12 12,-4 9,-4" fill="#d49d86" />
          <circle cx={7} cy={-13.5} r={2.2} fill="#f59aa8" />
          <circle cx={11} cy={-14} r={2.4} fill="#f9bf8c" />
          <g className="rising" fill={LIGHT}>
            <circle cx={9} cy={-18} r={1} />
            <circle cx={6} cy={-22} r={0.9} />
          </g>
        </g>
      );
    case "wave":
      return <Orb x={3} y={-46} r={3.2} pulse />;
    default:
      return <Orb x={8} y={-12} r={2.4} />;
  }
}
