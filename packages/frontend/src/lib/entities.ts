/**
 * Finding the integration's calendar entities.
 *
 * Entity ids are built from the config entry title, which is the Auto Cal
 * host — `calendar.auto_cal_local_4000_schedule`, `calendar.192_168_1_10_4000_schedule`.
 * So they cannot be guessed by name; the entity registry's `platform` is the
 * only reliable signal, with a name match as the fallback.
 */
import type { Hass } from "./types.js";

const DOMAIN = "auto_cal";

export interface AutoCalCalendars {
  schedule?: string;
  blocks?: string;
}

function friendlyName(hass: Hass, entityId: string): string {
  const state = hass.states[entityId];
  return String(state?.attributes.friendly_name ?? entityId).toLowerCase();
}

/** Calendar entities provided by this integration, best-effort. */
export function findAutoCalCalendars(hass: Hass): AutoCalCalendars {
  const calendars = Object.keys(hass.states).filter((id) =>
    id.startsWith("calendar."),
  );

  const registered = calendars.filter(
    (id) => hass.entities?.[id]?.platform === DOMAIN,
  );
  // Older frontends do not expose the registry: match the integration name.
  const candidates = registered.length
    ? registered
    : calendars.filter(
        (id) => id.includes(DOMAIN) || friendlyName(hass, id).includes("auto cal"),
      );

  const isBlocks = (id: string): boolean =>
    friendlyName(hass, id).includes("time block") || id.includes("time_block");

  return {
    schedule: candidates.find((id) => !isBlocks(id)),
    blocks: candidates.find(isBlocks),
  };
}
