import { describe, expect, it } from "vitest";

import { findAutoCalCalendars } from "../src/lib/entities.js";
import type { Hass } from "../src/lib/types.js";

/** Entity ids are slugified from the server host, so they vary per install. */
function makeHass(
  states: Record<string, string>,
  entities?: Record<string, string>,
): Hass {
  return {
    states: Object.fromEntries(
      Object.entries(states).map(([id, friendly_name]) => [
        id,
        { entity_id: id, state: "on", attributes: { friendly_name } },
      ]),
    ),
    entities: entities
      ? Object.fromEntries(
          Object.entries(entities).map(([id, platform]) => [
            id,
            { entity_id: id, platform },
          ]),
        )
      : undefined,
  } as unknown as Hass;
}

describe("findAutoCalCalendars", () => {
  it("uses the entity registry, whatever the host-derived id looks like", () => {
    const hass = makeHass(
      {
        "calendar.192_168_1_10_4000_schedule": "192.168.1.10:4000 Schedule",
        "calendar.192_168_1_10_4000_time_blocks": "192.168.1.10:4000 Time Blocks",
        "calendar.family": "Family",
      },
      {
        "calendar.192_168_1_10_4000_schedule": "auto_cal",
        "calendar.192_168_1_10_4000_time_blocks": "auto_cal",
        "calendar.family": "google",
      },
    );

    expect(findAutoCalCalendars(hass)).toEqual({
      schedule: "calendar.192_168_1_10_4000_schedule",
      blocks: "calendar.192_168_1_10_4000_time_blocks",
    });
  });

  it("never picks a calendar from another integration", () => {
    const hass = makeHass(
      { "calendar.family": "Family", "calendar.work": "Work" },
      { "calendar.family": "google", "calendar.work": "caldav" },
    );
    expect(findAutoCalCalendars(hass)).toEqual({
      schedule: undefined,
      blocks: undefined,
    });
  });

  it("falls back to names when the registry is unavailable", () => {
    const hass = makeHass({
      "calendar.auto_cal_local_4000_schedule": "auto-cal.local:4000 Schedule",
      "calendar.auto_cal_local_4000_time_blocks": "auto-cal.local:4000 Time Blocks",
      "calendar.family": "Family",
    });
    expect(findAutoCalCalendars(hass)).toEqual({
      schedule: "calendar.auto_cal_local_4000_schedule",
      blocks: "calendar.auto_cal_local_4000_time_blocks",
    });
  });

  it("matches a renamed entity by its friendly name", () => {
    const hass = makeHass({
      "calendar.my_schedule": "Auto Cal Schedule",
      "calendar.my_blocks": "Auto Cal Time Blocks",
    });
    expect(findAutoCalCalendars(hass)).toEqual({
      schedule: "calendar.my_schedule",
      blocks: "calendar.my_blocks",
    });
  });

  it("returns nothing when there are no calendars at all", () => {
    expect(findAutoCalCalendars(makeHass({}))).toEqual({
      schedule: undefined,
      blocks: undefined,
    });
  });
});
