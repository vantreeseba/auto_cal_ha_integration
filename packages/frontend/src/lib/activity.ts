/**
 * Parsing of Auto Cal's iCal payload into something a card can render.
 *
 * Auto Cal encodes item metadata in the event DESCRIPTION as one
 * `Key: value` pair per line:
 *
 *     Type: Todo
 *     Activity: Work
 *     Priority: 80
 *     Estimated: 60 min
 *
 * Time blocks (the `view=blocks` feed) carry no such fields — their SUMMARY
 * *is* the activity ("Deep Work"), so we fall back to it.
 */
import type { ActivityEvent, ActivityInfo, CalEvent } from "./types.js";

const FIELD_RE = /^\s*([A-Za-z ]+):\s*(.*)$/;

/** Fields we lift out of the description; everything else becomes `notes`. */
const KNOWN_FIELDS = new Set(["type", "activity", "priority", "estimated"]);

/** `todo-1-2026-05-13@auto-cal` / `block-1@auto-cal-2026-05-11` → `todo-1` / `block-1`. */
const UID_RE = /^(.*?)(?:-\d{4}-\d{2}-\d{2})?(?:@auto-cal)?(?:-\d{4}-\d{2}-\d{2})?$/;

export function parseDescription(description: string | null | undefined): ActivityInfo {
  const info: ActivityInfo = {
    activity: null,
    kind: null,
    priority: null,
    estimatedMinutes: null,
    notes: null,
  };
  if (!description) return info;

  const notes: string[] = [];
  // Servers that do not unescape iCal text send literal "\n" sequences.
  for (const line of description.split(/\r\n|\r|\n|\\n/)) {
    const match = FIELD_RE.exec(line);
    const key = match?.[1]?.trim().toLowerCase();
    const value = match?.[2]?.trim();

    if (!match || !key || !value || !KNOWN_FIELDS.has(key)) {
      if (line.trim()) notes.push(line.trim());
      continue;
    }

    switch (key) {
      case "type":
        info.kind = value;
        break;
      case "activity":
        info.activity = value;
        break;
      case "priority": {
        const priority = Number.parseInt(value, 10);
        if (!Number.isNaN(priority)) info.priority = priority;
        break;
      }
      case "estimated": {
        const minutes = parseEstimate(value);
        if (minutes !== null) info.estimatedMinutes = minutes;
        break;
      }
    }
  }

  info.notes = notes.length ? notes.join("\n") : null;
  return info;
}

/** "60 min" / "1h 30m" / "90" → minutes. */
export function parseEstimate(value: string): number | null {
  const hours = /(\d+(?:\.\d+)?)\s*h/i.exec(value);
  const minutes = /(\d+(?:\.\d+)?)\s*m/i.exec(value);
  if (hours || minutes) {
    const total =
      (hours ? Number.parseFloat(hours[1]!) * 60 : 0) +
      (minutes ? Number.parseFloat(minutes[1]!) : 0);
    return Math.round(total);
  }
  const bare = Number.parseFloat(value);
  return Number.isNaN(bare) ? null : Math.round(bare);
}

/**
 * Strip Auto Cal's UID decorations down to the underlying item id.
 *
 * This is the hook for acting on the current event (completing the todo,
 * starting a pomodoro): the id here is the same one the `todo` platform uses
 * as its `TodoItem.uid`.
 */
export function parseItemId(uid: string | null | undefined): string | null {
  if (!uid) return null;
  const id = UID_RE.exec(uid)?.[1]?.trim();
  return id ? id : null;
}

/** True for occurrences of a recurring time block rather than a scheduled item. */
export function isTimeBlock(event: CalEvent): boolean {
  return event.uid.startsWith("block-");
}

/** Decorate a raw calendar event with its parsed Auto Cal metadata. */
export function toActivityEvent(event: CalEvent): ActivityEvent {
  const info = parseDescription(event.description);
  return {
    ...event,
    info,
    itemId: parseItemId(event.uid),
    // A scheduled item names its activity type; a block's summary is the
    // activity itself. Either way this is "what I should be doing".
    label: info.activity ?? event.summary ?? "Unknown",
  };
}
