import type { FarmerAction } from "../game/engine";

export type FarmerPose = FarmerAction | "idle" | "walk" | "wave";

const CLOAK: [string, string] = ["#f2917f", "#cf6b6f"];
const HOOD = "#b85a66";
const SKIN: [string, string] = ["#fbeee4", "#ecd5cb"];
const LIGHT = "#fff3c4";
const WOOD: [string, string] = ["#c9a28f", "#a17868"];
const METAL: [string, string] = ["#cfe3e6", "#9fbcc4"];

/**
 * The wanderer who tends the farm: a small cloaked figure with no face.
 * Drawn as an SVG group with the feet at (0, 0), about 40px tall. `facing` flips it.
 * Each job has its own tool and motion so you can tell from afar what it's doing.
 */
export function Wanderer({ pose = "idle", facing = 1 }: { pose?: FarmerPose; facing?: 1 | -1 }) {
  const lean = pose === "weed" ? 20 : pose === "plant" || pose === "replant" ? 12 : pose === "plow" ? 8 : 0;
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

function Hand({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={2} fill={SKIN[0]} />;
}

function Held({ pose }: { pose: FarmerPose }) {
  switch (pose) {
    case "plow":
      // a hoe, swinging down into the soil
      return (
        <g className="swing">
          <line x1={4} y1={-20} x2={17} y2={2} stroke={WOOD[0]} strokeWidth={1.8} strokeLinecap="round" />
          <polygon points="15,0 21,-1 20,4 15,3" fill={METAL[1]} />
          <polygon points="15,0 18,-0.5 18,3.5 15,3" fill={METAL[0]} />
          <Hand x={6} y={-17} />
          <Hand x={10} y={-10} />
        </g>
      );
    case "water":
      // a watering can, tipped and pouring
      return (
        <g>
          <g className="pour">
            <g transform="rotate(32 10 -14)">
              <rect x={5} y={-19} width={11} height={9} rx={2} fill={METAL[0]} />
              <rect x={10.5} y={-19} width={5.5} height={9} rx={1} fill={METAL[1]} />
              <polygon points="16,-16 24,-21 25,-19.5 16,-13" fill={METAL[1]} />
              <path d="M6 -19 Q10.5 -25 15 -19" fill="none" stroke={METAL[1]} strokeWidth={1.4} />
            </g>
            <Hand x={7} y={-18} />
          </g>
          <g className="falling" fill="#bfe6f5">
            <ellipse cx={21} cy={-6} rx={0.9} ry={1.6} />
            <ellipse cx={18.5} cy={-3} rx={0.9} ry={1.6} />
            <ellipse cx={23} cy={-1} rx={0.9} ry={1.6} />
            <ellipse cx={20} cy={1} rx={0.9} ry={1.6} />
          </g>
        </g>
      );
    case "plant":
    case "replant":
      // a seed pouch, scattering seeds
      return (
        <g>
          <path d="M5 -15 Q4 -9 8 -8 Q12 -9 11 -15 Z" fill="#e8d0b4" />
          <path d="M8 -15 L11 -15 Q12 -9 8 -8 Z" fill="#d4b796" />
          <line x1={5} y1={-15} x2={11} y2={-15} stroke="#b08d6c" strokeWidth={1.2} />
          <Hand x={9} y={-9} />
          <g className="falling" fill="#f6dc98">
            <circle cx={11} cy={-5} r={1} />
            <circle cx={14} cy={-2} r={1} />
            <circle cx={10} cy={0} r={1} />
          </g>
        </g>
      );
    case "weed":
      // pulling a weed out by the roots
      return (
        <g className="tug">
          <line x1={10} y1={-6} x2={10} y2={0} stroke="#a17868" strokeWidth={0.9} />
          <polygon points="8,-6 10,-16 11,-6" fill="#74b39a" />
          <polygon points="9,-6 5,-14 11,-6" fill="#a8dcbf" />
          <polygon points="10,-6 15,-13 11,-6" fill="#74b39a" />
          <Hand x={10} y={-7} />
        </g>
      );
    case "harvest":
      // a basket of produce
      return (
        <g>
          <polygon points="4,-12 14,-12 12,-4 6,-4" fill="#e9b89a" />
          <polygon points="9,-12 14,-12 12,-4 9,-4" fill="#d49d86" />
          <path d="M5 -12 Q9 -19 13 -12" fill="none" stroke="#b98f7d" strokeWidth={1.2} />
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
