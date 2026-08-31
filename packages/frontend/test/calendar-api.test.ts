import { describe, expect, it } from "vitest";

import { parseDateString } from "../src/lib/calendar-api.js";
import { formatClock, isValidDate } from "../src/lib/time.js";

describe("parseDateString", () => {
  it("accepts the strict ISO form", () => {
    expect(parseDateString("2026-05-14T09:00:00+00:00")?.toISOString()).toBe(
      "2026-05-14T09:00:00.000Z",
    );
  });

  it("normalises the space separator entity attributes use", () => {
    // Safari and older WebViews return Invalid Date for the space form.
    const parsed = parseDateString("2026-05-14 09:00:00");
    expect(isValidDate(parsed)).toBe(true);
    expect(parsed?.getHours()).toBe(9);
  });

  it("normalises a colon-less UTC offset", () => {
    expect(parseDateString("2026-05-14T09:00:00+0000")?.toISOString()).toBe(
      "2026-05-14T09:00:00.000Z",
    );
  });

  it("returns null rather than an Invalid Date", () => {
    expect(parseDateString("not a date")).toBeNull();
    expect(parseDateString("")).toBeNull();
    expect(parseDateString(undefined)).toBeNull();
  });
});

describe("formatClock", () => {
  it("renders a placeholder for an unparseable date", () => {
    expect(formatClock(new Date("nope"))).toBe("--:--");
  });
});
