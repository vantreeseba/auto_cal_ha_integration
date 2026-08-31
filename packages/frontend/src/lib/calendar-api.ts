/** Reading calendar occurrences out of Home Assistant. */
import { toActivityEvent } from "./activity.js";
import { isValidDate } from "./time.js";
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

/**
 * Parse a timestamp the way every engine agrees on.
 *
 * Only the strict ISO form is universally supported: Safari and older WebViews
 * return `Invalid Date` for a space separator or a `+0000` offset, both of
 * which turn up in Home Assistant payloads and entity attributes.
 */
export function parseDateString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = String(value)
    .trim()
    .replace(" ", "T")
    // "+0000" / "-0500" → "+00:00" / "-05:00"; bare "Z" is already fine.
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(iso);
  return isValidDate(date) ? date : null;
}

function parseApiDate(value: ApiDate): { date: Date | null; allDay: boolean } {
  if (value.dateTime) return { date: parseDateString(value.dateTime), allDay: false };
  // All-day events carry a bare date, which `new Date()` would read as UTC.
  const parts = (value.date ?? "").split("-");
  const [y, m, d] = [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return { date: null, allDay: true };
  }
  return { date: new Date(y, m - 1, d), allDay: true };
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
        `calendars/${encodeURIComponent(entityId)}?${query}`,
      );
      return (Array.isArray(raw) ? raw : []).map((event) =>
        normalise(event, entityId),
      );
    }),
  );

  // Flattened by hand — `Array.prototype.flat` is missing from older WebViews.
  const events: ActivityEvent[] = [];
  for (const batch of perEntity) {
    for (const event of batch) {
      if (event) events.push(toActivityEvent(event));
    }
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Returns null for an event we could not make sense of, rather than NaN dates. */
function normalise(event: ApiEvent, entityId: string): CalEvent | null {
  const start = parseApiDate(event.start ?? {});
  const end = parseApiDate(event.end ?? {});
  if (!start.date || !end.date) return null;
  return {
    uid: event.uid ?? `${entityId}-${start.date.getTime()}`,
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

  // Attribute timestamps are local wall time ("2026-05-14 09:00:00").
  const start = parseDateString(start_time);
  const end = parseDateString(end_time);
  if (!start || !end) return null;

  return toActivityEvent({
    uid: `${entityId}-state`,
    summary: message,
    description: description ?? null,
    start,
    end,
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
