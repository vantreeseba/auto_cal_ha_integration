/** Reading calendar occurrences out of Home Assistant. */
import { toActivityEvent } from "./activity.js";
import type { ActivityEvent, CalEvent, Hass } from "./types.js";

interface ApiDate {
  dateTime?: string;
  date?: string;
}

interface ApiEvent {
  uid?: string;
  summary?: string;
  description?: string | null;
  location?: string | null;
  start: ApiDate;
  end: ApiDate;
}

function parseApiDate(value: ApiDate): { date: Date; allDay: boolean } {
  if (value.dateTime) return { date: new Date(value.dateTime), allDay: false };
  // All-day events carry a bare date, which `new Date()` would read as UTC.
  const [y, m, d] = (value.date ?? "").split("-").map(Number);
  return { date: new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1), allDay: true };
}

/**
 * Fetch every occurrence of `entityIds` overlapping `[start, end)`.
 *
 * Uses the same REST endpoint the built-in calendar panel does, so recurring
 * time blocks are expanded server-side by the integration.
 */
export async function fetchActivityEvents(
  hass: Hass,
  entityIds: string[],
  start: Date,
  end: Date,
): Promise<ActivityEvent[]> {
  const query = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(
    end.toISOString(),
  )}`;

  const perEntity = await Promise.all(
    entityIds.map(async (entityId) => {
      const raw = await hass.callApi<ApiEvent[]>(
        "GET",
        `calendars/${entityId}?${query}`,
      );
      return raw.map((event) => normalise(event, entityId));
    }),
  );

  return perEntity
    .flat()
    .map(toActivityEvent)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function normalise(event: ApiEvent, entityId: string): CalEvent {
  const start = parseApiDate(event.start);
  const end = parseApiDate(event.end);
  return {
    uid: event.uid ?? `${entityId}-${start.date.toISOString()}`,
    summary: event.summary ?? "",
    description: event.description ?? null,
    start: start.date,
    end: end.date,
    allDay: start.allDay,
    entityId,
  };
}

/**
 * Best-effort event straight off the entity's attributes.
 *
 * Calendar entities publish their current-or-next event as state attributes,
 * which lets the card paint something immediately (and keep working) even if
 * the REST fetch is slow or fails.
 */
export function eventFromAttributes(
  hass: Hass,
  entityId: string,
): ActivityEvent | null {
  const state = hass.states[entityId];
  const { message, start_time, end_time, description, all_day } =
    state?.attributes ?? {};
  if (!state || !message || !start_time || !end_time) return null;

  return toActivityEvent({
    uid: `${entityId}-state`,
    summary: message,
    description: description ?? null,
    // Attribute timestamps are local wall time ("2026-05-14 09:00:00").
    start: new Date(start_time.replace(" ", "T")),
    end: new Date(end_time.replace(" ", "T")),
    allDay: Boolean(all_day),
    entityId,
  });
}

/** The event covering `now`, if any. */
export function currentEvent(
  events: ActivityEvent[],
  now: Date,
): ActivityEvent | null {
  return events.find((e) => e.start <= now && e.end > now) ?? null;
}

/** The soonest event that has not started yet. */
export function nextEvent(events: ActivityEvent[], now: Date): ActivityEvent | null {
  return events.find((e) => e.start > now) ?? null;
}
