import { describe, expect, it } from "vitest";
import { sunPosition, sunTimes } from "./sun";

const minutesApart = (a: Date | null, iso: string) => Math.abs((a?.valueOf() ?? NaN) - new Date(iso).valueOf()) / 60_000;

describe("sunTimes", () => {
  it("matches published times for New York on the June solstice", () => {
    // Published: sunrise 5:25 EDT (09:25 UTC), sunset 8:31 EDT (00:31 UTC next day)
    const t = sunTimes(new Date("2026-06-21T04:00:00Z"), 40.7128, -74.006);
    expect(minutesApart(t.sunrise, "2026-06-21T09:25:00Z")).toBeLessThan(3);
    expect(minutesApart(t.sunset, "2026-06-22T00:31:00Z")).toBeLessThan(3);
  });

  it("matches published times for London in December", () => {
    // Published: sunrise 08:04 GMT, sunset 15:53 GMT on 21 Dec
    const t = sunTimes(new Date("2026-12-21T00:00:00Z"), 51.5074, -0.1278);
    expect(minutesApart(t.sunrise, "2026-12-21T08:04:00Z")).toBeLessThan(3);
    expect(minutesApart(t.sunset, "2026-12-21T15:53:00Z")).toBeLessThan(3);
  });

  it("reports no sunset during the midnight sun", () => {
    const t = sunTimes(new Date("2026-06-21T00:00:00Z"), 69.6492, 18.9553); // Tromsø
    expect(t.sunset).toBeNull();
    expect(t.sunrise).toBeNull();
  });
});

describe("sunPosition", () => {
  it("puts the sun high in the south at solar noon in the northern summer", () => {
    const p = sunPosition(new Date("2026-06-21T16:57:00Z"), 40.7128, -74.006);
    expect(p.altitude).toBeGreaterThan(70);
    expect(Math.abs(p.azimuth)).toBeLessThan(10);
  });

  it("puts the sun in the east in the morning and below the horizon at midnight", () => {
    expect(sunPosition(new Date("2026-06-21T12:00:00Z"), 40.7128, -74.006).azimuth).toBeLessThan(-45);
    expect(sunPosition(new Date("2026-06-21T04:00:00Z"), 40.7128, -74.006).altitude).toBeLessThan(-10);
  });
});
