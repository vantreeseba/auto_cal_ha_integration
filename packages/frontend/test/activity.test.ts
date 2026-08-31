import { describe, expect, it } from "vitest";

import {
  isTimeBlock,
  parseDescription,
  parseEstimate,
  parseItemId,
  toActivityEvent,
} from "../src/lib/activity.js";
import { colorForActivity } from "../src/lib/colors.js";
import { currentEvent, nextEvent } from "../src/lib/calendar-api.js";
import { formatDuration, progressFraction } from "../src/lib/time.js";
import type { CalEvent } from "../src/lib/types.js";

const AUTO_CAL_DESCRIPTION = [
  "Type: Todo",
  "Activity: Work",
  "Priority: 80",
  "Estimated: 60 min",
].join("\n");

function event(overrides: Partial<CalEvent> = {}): CalEvent {
  return {
    uid: "todo-1-2026-05-13@auto-cal",
    summary: "Write tests",
    description: AUTO_CAL_DESCRIPTION,
    start: new Date("2026-05-14T09:00:00Z"),
    end: new Date("2026-05-14T10:00:00Z"),
    allDay: false,
    entityId: "calendar.auto_cal_schedule",
    ...overrides,
  };
}

describe("parseDescription", () => {
  it("pulls the Auto Cal fields out of a scheduled item", () => {
    expect(parseDescription(AUTO_CAL_DESCRIPTION)).toEqual({
      activity: "Work",
      kind: "Todo",
      priority: 80,
      estimatedMinutes: 60,
      notes: null,
    });
  });

  it("handles literal \\n escapes from unescaped feeds", () => {
    const info = parseDescription("Type: Habit\\nActivity: Personal");
    expect(info.kind).toBe("Habit");
    expect(info.activity).toBe("Personal");
  });

  it("keeps unrecognised lines as notes", () => {
    const info = parseDescription("Focus block\nActivity: Deep Work");
    expect(info.activity).toBe("Deep Work");
    expect(info.notes).toBe("Focus block");
  });

  it("returns empty info for missing descriptions", () => {
    expect(parseDescription(null).activity).toBeNull();
    expect(parseDescription("").notes).toBeNull();
  });
});

describe("parseEstimate", () => {
  it.each([
    ["60 min", 60],
    ["1h 30m", 90],
    ["2 h", 120],
    ["45", 45],
    ["soon", null],
  ])("parses %s", (input, expected) => {
    expect(parseEstimate(input)).toBe(expected);
  });
});

describe("parseItemId", () => {
  it.each([
    ["todo-1-2026-05-13@auto-cal", "todo-1"],
    ["block-1@auto-cal-2026-05-11", "block-1"],
    ["habit-2-2026-05-13@auto-cal", "habit-2"],
    ["plain-id", "plain-id"],
  ])("%s → %s", (uid, expected) => {
    expect(parseItemId(uid)).toBe(expected);
  });

  it("returns null when there is no uid", () => {
    expect(parseItemId(null)).toBeNull();
  });
});

describe("toActivityEvent", () => {
  it("uses the activity type as the label for scheduled items", () => {
    const activity = toActivityEvent(event());
    expect(activity.label).toBe("Work");
    expect(activity.itemId).toBe("todo-1");
    expect(activity.info.kind).toBe("Todo");
  });

  it("falls back to the summary for time blocks", () => {
    const block = toActivityEvent(
      event({ uid: "block-1@auto-cal", summary: "Deep Work", description: "Focus block" }),
    );
    expect(block.label).toBe("Deep Work");
    expect(isTimeBlock(block)).toBe(true);
  });
});

describe("event selection", () => {
  const events = [
    toActivityEvent(event()),
    toActivityEvent(
      event({
        uid: "todo-2-2026-05-13@auto-cal",
        summary: "Read",
        description: "Type: Habit\nActivity: Personal",
        start: new Date("2026-05-14T11:00:00Z"),
        end: new Date("2026-05-14T12:00:00Z"),
      }),
    ),
  ];

  it("finds the event covering now", () => {
    const now = new Date("2026-05-14T09:30:00Z");
    expect(currentEvent(events, now)?.label).toBe("Work");
    expect(nextEvent(events, now)?.label).toBe("Personal");
  });

  it("reports no current event in a gap", () => {
    const now = new Date("2026-05-14T10:30:00Z");
    expect(currentEvent(events, now)).toBeNull();
    expect(nextEvent(events, now)?.summary).toBe("Read");
  });

  it("reports nothing left after the last event", () => {
    const now = new Date("2026-05-14T13:00:00Z");
    expect(nextEvent(events, now)).toBeNull();
  });
});

describe("time helpers", () => {
  it.each([
    [0, "0m"],
    [95 * 60_000, "1h 35m"],
    [2 * 3600_000, "2h"],
    [-5000, "0m"],
  ])("formats %s ms", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it("clamps progress to the event window", () => {
    const start = new Date("2026-05-14T09:00:00Z");
    const end = new Date("2026-05-14T10:00:00Z");
    expect(progressFraction(start, end, new Date("2026-05-14T09:30:00Z"))).toBeCloseTo(0.5);
    expect(progressFraction(start, end, new Date("2026-05-14T08:00:00Z"))).toBe(0);
    expect(progressFraction(start, end, new Date("2026-05-14T11:00:00Z"))).toBe(1);
  });
});

describe("colorForActivity", () => {
  it("is stable and case-insensitive", () => {
    expect(colorForActivity("Work")).toBe(colorForActivity("work"));
    expect(colorForActivity("Work")).not.toBe(colorForActivity("Personal"));
  });

  it("honours configured overrides", () => {
    expect(colorForActivity("Work", { work: "#123456" })).toBe("#123456");
  });

  it("falls back to a theme colour when there is no activity", () => {
    expect(colorForActivity(null)).toBe("var(--secondary-text-color)");
  });
});
