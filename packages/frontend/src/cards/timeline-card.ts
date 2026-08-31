/**
 * `custom:auto-cal-activity-timeline-card` — today's activities at a glance.
 *
 * Lays the day out as a single lane coloured by activity type, with the
 * time-blocks feed as a faint background lane and a marker at "now", plus a
 * list of the remaining items.
 */
import { colorForActivity, type ColorOverrides } from "../lib/colors.js";
import { escapeHtml, showMoreInfo } from "../lib/dom.js";
import { findAutoCalCalendars } from "../lib/entities.js";
import { BASE_STYLES } from "../lib/styles.js";
import { addDays, formatClock, startOfDay } from "../lib/time.js";
import type { ActivityEvent, Hass, LovelaceCardConfig } from "../lib/types.js";
import { AutoCalBaseCard } from "./base-card.js";

export interface TimelineCardConfig extends LovelaceCardConfig {
  entity: string;
  blocks_entity?: string;
  name?: string;
  /** Clamp the lane to these local hours; defaults to fitting the day's events. */
  start_hour?: number;
  end_hour?: number;
  show_list?: boolean;
  activity_colors?: ColorOverrides;
}

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;

export class AutoCalTimelineCard extends AutoCalBaseCard<TimelineCardConfig> {
  static getConfigElement(): HTMLElement {
    void window.loadCardHelpers?.();
    return document.createElement("auto-cal-timeline-card-editor");
  }

  static getStubConfig(hass: Hass): Partial<TimelineCardConfig> {
    const { schedule, blocks } = findAutoCalCalendars(hass);
    return { entity: schedule ?? "", blocks_entity: blocks };
  }

  getCardSize(): number {
    return 4;
  }

  protected validateConfig(config: TimelineCardConfig): TimelineCardConfig {
    if (!config?.entity) {
      throw new Error("auto-cal-activity-timeline-card: `entity` is required");
    }
    return { show_list: true, ...config };
  }

  protected entityIds(): string[] {
    return [this.config.entity, this.config.blocks_entity].filter(
      (id): id is string => Boolean(id),
    );
  }

  protected range(now: Date): { start: Date; end: Date } {
    const start = startOfDay(now);
    return { start, end: addDays(start, 1) };
  }

  protected override afterRender(): void {
    this.query<HTMLElement>("ha-card")?.addEventListener("click", () => {
      showMoreInfo(this, this.config.entity);
    });
  }

  protected template(now: Date): string {
    const dayStart = startOfDay(now);
    const scheduled = this.events.filter((e) => e.entityId === this.config.entity);
    const blocks = this.config.blocks_entity
      ? this.events.filter((e) => e.entityId === this.config.blocks_entity)
      : [];

    const [fromHour, toHour] = this.bounds(scheduled.concat(blocks), dayStart, now);
    const position = (date: Date): number => {
      const hour = (date.getTime() - dayStart.getTime()) / 3600_000;
      return ((hour - fromHour) / (toHour - fromHour)) * 100;
    };

    const remaining = scheduled.filter((e) => e.end > now);

    return `
      <style>
        ${BASE_STYLES}
        ha-card { cursor: pointer; }
        .lane {
          position: relative;
          height: 34px;
          border-radius: 6px;
          background: var(--divider-color);
          overflow: hidden;
        }
        .lane.blocks { height: 10px; margin-bottom: 4px; opacity: 0.45; }
        .seg {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 4px;
          display: flex;
          align-items: center;
          padding: 0 6px;
          box-sizing: border-box;
          font-size: 0.72rem;
          font-weight: 600;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          white-space: nowrap;
        }
        .seg.past { opacity: 0.45; }
        .now {
          position: absolute;
          top: -4px;
          bottom: -4px;
          width: 2px;
          background: var(--error-color, #db4437);
          z-index: 2;
        }
        .ticks {
          position: relative;
          height: 14px;
          margin-top: 4px;
          font-size: 0.68rem;
          color: var(--secondary-text-color);
        }
        .tick { position: absolute; transform: translateX(-50%); }
        /* Margins rather than gap: flex gap is ignored before Safari 14.1. */
        .list { margin-top: 12px; }
        .list > .row + .row { margin-top: 8px; }
        .row { display: flex; align-items: baseline; font-size: 0.9rem; }
        .row > * + * { margin-left: 8px; }
        .row .dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; align-self: center; }
        .row .time { color: var(--secondary-text-color); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .row .what { font-weight: 600; }
        .row .detail {
          color: var(--secondary-text-color);
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .empty { color: var(--secondary-text-color); font-size: 0.9rem; margin-top: 12px; }
      </style>
      <ha-card>
        <div class="header">${escapeHtml(this.config.name ?? "Today")}</div>
        ${this.loadError ? `<div class="error">${escapeHtml(this.loadError)}</div>` : ""}
        ${blocks.length ? `<div class="lane blocks">${this.segments(blocks, position, now, false)}</div>` : ""}
        <div class="lane">
          ${this.segments(scheduled, position, now, true)}
          ${this.nowMarker(position(now))}
        </div>
        <div class="ticks">${this.ticks(fromHour, toHour, dayStart, position)}</div>
        ${this.config.show_list ? this.renderList(remaining, now) : ""}
      </ha-card>
    `;
  }

  /** Hour window to draw: the configured one, else one that fits the day. */
  private bounds(events: ActivityEvent[], dayStart: Date, now: Date): [number, number] {
    if (this.config.start_hour !== undefined && this.config.end_hour !== undefined) {
      return [this.config.start_hour, this.config.end_hour];
    }
    const hourOf = (date: Date): number =>
      (date.getTime() - dayStart.getTime()) / 3600_000;

    // Built by hand — `Array.prototype.flatMap` is missing from older WebViews.
    const hours: number[] = [];
    for (const event of events) {
      hours.push(hourOf(event.start), hourOf(event.end));
    }
    hours.push(hourOf(now));

    const finite = hours.filter((hour) => Number.isFinite(hour));
    const from = Math.max(0, Math.floor(Math.min(DEFAULT_START_HOUR, ...finite)));
    const to = Math.min(24, Math.ceil(Math.max(DEFAULT_END_HOUR, ...finite)));
    return from < to ? [from, to] : [DEFAULT_START_HOUR, DEFAULT_END_HOUR];
  }

  private segments(
    events: ActivityEvent[],
    position: (date: Date) => number,
    now: Date,
    labelled: boolean,
  ): string {
    return events
      .map((event) => {
        const left = position(event.start);
        const right = position(event.end);
        const width = right - left;
        if (!Number.isFinite(left) || !Number.isFinite(width)) return "";
        if (right <= 0 || left >= 100 || width <= 0) return "";

        const clampedLeft = Math.max(0, left);
        const color = colorForActivity(event.label, this.config.activity_colors ?? {});
        const past = event.end <= now ? " past" : "";
        const title = `${formatClock(event.start, this.locale)}–${formatClock(event.end, this.locale)} ${event.label}`;
        return `<div class="seg${past}" style="left:${clampedLeft.toFixed(2)}%;width:${Math.min(
          100 - clampedLeft,
          width,
        ).toFixed(2)}%;background:${escapeHtml(color)}" title="${escapeHtml(title)}">${
          labelled ? escapeHtml(event.label) : ""
        }</div>`;
      })
      .join("");
  }

  private nowMarker(left: number): string {
    if (!Number.isFinite(left) || left < 0 || left > 100) return "";
    return `<div class="now" style="left:${left.toFixed(2)}%"></div>`;
  }

  private ticks(
    fromHour: number,
    toHour: number,
    dayStart: Date,
    position: (date: Date) => number,
  ): string {
    const span = toHour - fromHour;
    const step = span > 12 ? 4 : span > 6 ? 2 : 1;
    const marks: string[] = [];
    for (let hour = Math.ceil(fromHour); hour <= toHour; hour += step) {
      const at = new Date(dayStart.getTime() + hour * 3600_000);
      marks.push(
        `<span class="tick" style="left:${position(at).toFixed(2)}%">${escapeHtml(
          formatClock(at, this.locale),
        )}</span>`,
      );
    }
    return marks.join("");
  }

  private renderList(events: ActivityEvent[], now: Date): string {
    if (!events.length) {
      return `<div class="empty">Nothing left on the schedule today.</div>`;
    }
    return `<div class="list">${events
      .map((event) => {
        const color = colorForActivity(event.label, this.config.activity_colors ?? {});
        const active = event.start <= now && event.end > now;
        const detail =
          event.summary && event.summary !== event.label
            ? `<span class="detail">${escapeHtml(event.summary)}</span>`
            : "";
        return `
          <div class="row">
            <span class="dot" style="background:${escapeHtml(color)}"></span>
            <span class="time">${escapeHtml(formatClock(event.start, this.locale))}</span>
            <span class="what">${escapeHtml(event.label)}</span>
            ${detail}
            ${active ? `<span class="chip" style="--auto-cal-accent:${escapeHtml(color)}">now</span>` : ""}
          </div>`;
      })
      .join("")}</div>`;
  }

  private get locale(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }
}
