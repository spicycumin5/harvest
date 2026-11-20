import type { Pt } from "../iso";
import type { SkyState } from "../../lib/sky";

/**
 * Where the sun sits in the scene: it rises low on the left (east) and sets low on the
 * right (west). The arc leans right and is scaled to today's highest sun, so at midday
 * it rides above and beside the farm instead of hiding behind it.
 */
function sunScreen(sky: SkyState, span: number, horizonY: number): Pt {
  const TOP_Y = -110;
  const across = Math.sin((sky.azimuth * Math.PI) / 180); // -1 east … +1 west
  const x = across * span + (1 - Math.abs(across)) * span * 0.55;
  const lift = Math.max(-0.25, sky.altitude / Math.max(15, sky.peak));
  return [x, horizonY - lift * (horizonY - TOP_Y)];
}

const STARS: Pt[] = [
  [-420, -200], [-330, -120], [-250, -220], [-160, -160], [-60, -230], [40, -190], [120, -130], [190, -230],
  [330, -180], [400, -120], [-390, -40], [420, 0], [-200, -60], [80, -60], [360, 60], [-430, 120],
  [-560, -150], [560, -90], [-620, 40], [640, 120], [-120, -330], [230, -340], [-300, -300], [470, -280],
];

/** The sky itself: gradient, sun, moon and stars. Themes draw their horizon on top. */
export function SkyLayer({ sky, id, span, horizonY }: { sky: SkyState; id: string; span: number; horizonY: number }) {
  const [a, b, c] = sky.colors;
  const [sx, sy] = sunScreen(sky, span, horizonY);
  const dark = sky.dark;
  const sunR = 40 + Math.max(0, 12 - Math.max(0, sky.altitude));
  const moon = { x: span * 0.62, y: horizonY - Math.max(-12, -sky.altitude) * 7.5, r: 24 };
  return (
    <g>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0" stopColor={sky.sunColor} stopOpacity={0.95} />
          <stop offset="0.35" stopColor={sky.sunColor} stopOpacity={0.5} />
          <stop offset="1" stopColor={sky.sunColor} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`moonhalo-${id}`}>
          <stop offset="0" stopColor="#f4eefc" stopOpacity={0.6} />
          <stop offset="1" stopColor="#f4eefc" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-3000} y={-1500} width={6000} height={3000} fill={`url(#sky-${id})`} />
      {dark > 0 && (
        <g opacity={dark}>
          {STARS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.7} fill="#fdf6ff" className="twinkle" style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
          ))}
          <circle cx={moon.x} cy={moon.y} r={moon.r * 2.6} fill={`url(#moonhalo-${id})`} />
          <path
            d={`M${moon.x} ${moon.y - moon.r} A${moon.r} ${moon.r} 0 1 0 ${moon.x} ${moon.y + moon.r} A${moon.r * 0.72} ${moon.r} 0 1 1 ${moon.x} ${moon.y - moon.r} Z`}
            fill="#f4eefc"
          />
        </g>
      )}
      {sky.altitude > -8 && (
        <g>
          <circle cx={sx} cy={sy} r={sunR * 4} fill={`url(#halo-${id})`} />
          <circle cx={sx} cy={sy} r={sunR} fill={sky.sunColor} />
        </g>
      )}
    </g>
  );
}
