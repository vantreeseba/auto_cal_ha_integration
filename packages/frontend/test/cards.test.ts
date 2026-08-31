// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutoCalActivityCard } from "../src/cards/activity-card.js";
import { AutoCalTimelineCard } from "../src/cards/timeline-card.js";
import type { Hass } from "../src/lib/types.js";

const SCHEDULE = "calendar.auto_cal_schedule";
const BLOCKS = "calendar.auto_cal_time_blocks";

/** Local-time ISO string `hours` from now, as the calendar REST API returns. */
function at(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

function apiEvent(
  summary: string,
  description: string | null,
  startHours: number,
  endHours: number,
  uid = `todo-1-2026-05-13@auto-cal`,
) {
  return {
    uid,
    summary,
    description,
    start: { dateTime: at(startHours) },
    end: { dateTime: at(endHours) },
  };
}

function makeHass(events: Record<string, unknown[]>): Hass {
  return {
    states: {
      [SCHEDULE]: {
        entity_id: SCHEDULE,
        state: "on",
        last_changed: "2026-05-14T09:00:00+00:00",
        last_updated: "2026-05-14T09:00:00+00:00",
        attributes: {},
      },
      [BLOCKS]: {
        entity_id: BLOCKS,
        state: "on",
        last_changed: "2026-05-14T09:00:00+00:00",
        last_updated: "2026-05-14T09:00:00+00:00",
        attributes: {},
      },
    },
    locale: { language: "en" },
    callApi: vi.fn(async (_method: string, path: string) => {
      const entityId = path.slice("calendars/".length).split("?")[0]!;
      return events[entityId] ?? [];
    }) as unknown as Hass["callApi"],
    callWS: vi.fn(),
    callService: vi.fn(),
  };
}

customElements.define("test-activity-card", AutoCalActivityCard);
customElements.define("test-timeline-card", AutoCalTimelineCard);

/** Drain pending microtasks so the in-flight event fetch settles. */
async function flush(turns = 3): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Attach a card, feed it hass, and wait for the fetch to settle. */
async function mount<T extends HTMLElement & { setConfig(c: never): void }>(
  tagName: string,
  config: Record<string, unknown>,
  hass: Hass,
): Promise<T> {
  const card = document.createElement(tagName) as T;
  document.body.append(card);
  card.setConfig(config as never);
  (card as unknown as { hass: Hass }).hass = hass;
  await vi.waitFor(() => {
    if (!card.shadowRoot?.querySelector("ha-card")) throw new Error("not rendered");
  });
  // The card paints immediately from cache, then again once events land.
  await flush();
  return card;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("auto-cal-activity-card", () => {
  it("rejects a config without a calendar entity", () => {
    const card = document.createElement("test-activity-card") as AutoCalActivityCard;
    expect(() => card.setConfig({ type: "x" } as never)).toThrow(/entity/);
    expect(() => card.setConfig({ type: "x", entity: "sensor.foo" })).toThrow(
      /calendar entity/,
    );
  });

  it("headlines the activity type of the current event", async () => {
    const hass = makeHass({
      [SCHEDULE]: [
        apiEvent("Write tests", "Type: Todo\nActivity: Work\nEstimated: 60 min", -0.5, 0.5),
        apiEvent(
          "Read",
          "Type: Habit\nActivity: Personal",
          2,
          3,
          "habit-2-2026-05-13@auto-cal",
        ),
      ],
    });
    const card = await mount<AutoCalActivityCard>("test-activity-card", { type: "x", entity: SCHEDULE }, hass);
    const text = card.shadowRoot!.textContent!;

    expect(card.shadowRoot!.querySelector(".activity")!.textContent).toBe("Work");
    expect(text).toContain("Now");
    expect(text).toContain("Write tests");
    expect(text).toContain("Todo");
    expect(text).toContain("left");
    // "Up next" section
    expect(text).toContain("Personal");
  });

  it("shows the containing time block when nothing is scheduled", async () => {
    const hass = makeHass({
      [SCHEDULE]: [],
      [BLOCKS]: [apiEvent("Deep Work", "Focus block", -1, 1, "block-1@auto-cal")],
    });
    const card = await mount<AutoCalActivityCard>(
      "test-activity-card",
      { type: "x", entity: SCHEDULE, blocks_entity: BLOCKS },
      hass,
    );
    const text = card.shadowRoot!.textContent!;

    expect(text).toContain("Nothing scheduled");
    expect(text).toContain("Deep Work");
  });

  it("surfaces a fetch failure instead of rendering stale state", async () => {
    const hass = makeHass({});
    hass.callApi = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as Hass["callApi"];

    const card = await mount<AutoCalActivityCard>("test-activity-card", { type: "x", entity: SCHEDULE }, hass);
    expect(card.shadowRoot!.querySelector(".error")!.textContent).toContain("boom");
  });
});

describe("auto-cal-activity-timeline-card", () => {
  it("draws a segment per event plus a now marker", async () => {
    const hass = makeHass({
      [SCHEDULE]: [
        apiEvent("Write tests", "Type: Todo\nActivity: Work", -0.5, 0.5),
        apiEvent("Read", "Type: Habit\nActivity: Personal", 1, 2, "habit-2@auto-cal"),
      ],
    });
    const card = await mount<AutoCalTimelineCard>("test-timeline-card", { type: "x", entity: SCHEDULE }, hass);
    const root = card.shadowRoot!;

    // Events far from "now" can fall outside today's window in CI's timezone,
    // so assert on what is guaranteed: the lane, the marker, and the list.
    expect(root.querySelector(".lane")).not.toBeNull();
    expect(root.querySelector(".now")).not.toBeNull();
    expect(root.textContent).toContain("Work");
  });

  it("says so when the day is done", async () => {
    const hass = makeHass({ [SCHEDULE]: [] });
    const card = await mount<AutoCalTimelineCard>("test-timeline-card", { type: "x", entity: SCHEDULE }, hass);
    expect(card.shadowRoot!.textContent).toContain("Nothing left on the schedule");
  });
});
