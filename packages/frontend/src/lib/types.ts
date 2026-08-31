/** Minimal structural types for the bits of Home Assistant the cards touch. */

export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    message?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    all_day?: boolean;
  };
}

export interface HassLocale {
  language: string;
  time_format?: string;
}

export interface Hass {
  states: Record<string, HassEntity | undefined>;
  locale?: HassLocale;
  language?: string;
  callApi<T>(method: string, path: string, parameters?: unknown): Promise<T>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown>;
}

/** A calendar occurrence, normalised from either the REST API or entity attributes. */
export interface CalEvent {
  uid: string;
  summary: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  /** Which configured calendar entity produced this event. */
  entityId: string;
}

/** The Auto Cal metadata encoded in an event's DESCRIPTION. */
export interface ActivityInfo {
  /** Activity type name, e.g. "Work" — the headline of the activity card. */
  activity: string | null;
  /** "Todo" | "Habit" as reported by Auto Cal, or null for time blocks. */
  kind: string | null;
  priority: number | null;
  estimatedMinutes: number | null;
  /** Any description lines that were not recognised Auto Cal fields. */
  notes: string | null;
}

/** An event plus its parsed Auto Cal metadata. */
export interface ActivityEvent extends CalEvent {
  info: ActivityInfo;
  /** Auto Cal item id parsed out of the UID, when present. */
  itemId: string | null;
  /** The label to show as "what you should be doing". */
  label: string;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}
