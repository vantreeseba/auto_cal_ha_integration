/**
 * `custom:auto-cal-activity-card` — what you should be doing right now.
 *
 * Reads an Auto Cal calendar entity, pulls the activity type out of the
 * current event, and renders it large, with the scheduled item, how much of
 * the slot is left, and what is up next.
 */
import { currentEvent, eventFromAttributes, nextEvent } from "../lib/calendar-api.js";
import { colorForActivity, type ColorOverrides } from "../lib/colors.js";
import { escapeHtml, showMoreInfo } from "../lib/dom.js";
import { findAutoCalCalendars } from "../lib/entities.js";
import { BASE_STYLES } from "../lib/styles.js";
import { formatClock, formatDuration, progressFraction } from "../lib/time.js";
import type { ActivityEvent, Hass, LovelaceCardConfig } from "../lib/types.js";
import { AutoCalBaseCard } from "./base-card.js";

export interface ActivityCardConfig extends LovelaceCardConfig {
  /** Auto Cal "Schedule" calendar entity. */
  entity: string;
  /** Optional "Time Blocks" calendar entity, shown as context for the slot. */
  blocks_entity?: string;
  name?: string;
  show_next?: boolean;
  show_progress?: boolean;
  show_details?: boolean;
  activity_colors?: ColorOverrides;
}

const LOOKAHEAD_HOURS = 36;
const LOOKBEHIND_HOURS = 2;

export class AutoCalActivityCard extends AutoCalBaseCard<ActivityCardConfig> {
  static getConfigElement(): HTMLElement {
    void window.loadCardHelpers?.();
    return document.createElement("auto-cal-activity-card-editor");
  }

  static getStubConfig(hass: Hass): Partial<ActivityCardConfig> {
    const { schedule, blocks } = findAutoCalCalendars(hass);
    return { entity: schedule ?? "", blocks_entity: blocks };
  }

  getCardSize(): number {
    return 3;
  }

  protected validateConfig(config: ActivityCardConfig): ActivityCardConfig {
    if (!config?.entity) {
      throw new Error("auto-cal-activity-card: `entity` is required");
    }
    if (!config.entity.startsWith("calendar.")) {
      throw new Error("auto-cal-activity-card: `entity` must be a calendar entity");
    }
    return {
      show_next: true,
      show_progress: true,
      show_details: true,
      ...config,
    };
  }

  protected entityIds(): string[] {
    return [this.config.entity, this.config.blocks_entity].filter(
      (id): id is string => Boolean(id),
    );
  }

  protected range(now: Date): { start: Date; end: Date } {
    return {
      start: new Date(now.getTime() - LOOKBEHIND_HOURS * 3600_000),
      end: new Date(now.getTime() + LOOKAHEAD_HOURS * 3600_000),
    };
  }

  protected override afterRender(): void {
    this.query<HTMLElement>("ha-card")?.addEventListener("click", () => {
      showMoreInfo(this, this.config.entity);
    });
  }

  protected template(now: Date): string {
    const scheduled = this.events.filter((e) => e.entityId === this.config.entity);
    const blocks = this.config.blocks_entity
      ? this.events.filter((e) => e.entityId === this.config.blocks_entity)
      : [];

    // Fall back to the entity's own attributes until the first fetch lands.
    const fallback =
      this.hass && !scheduled.length
        ? eventFromAttributes(this.hass, this.config.entity)
        : null;
    const pool = scheduled.length ? scheduled : fallback ? [fallback] : [];

    const current = currentEvent(pool, now);
    const upcoming = nextEvent(pool, now);
    const block = currentEvent(blocks, now);
    const accent = colorForActivity(
      current?.label ?? block?.label,
      this.config.activity_colors ?? {},
    );

    return `
      <style>
        ${BASE_STYLES}
        ha-card { cursor: pointer; }
        .activity {
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 1.15;
          color: var(--auto-cal-accent);
          margin: 8px 0 2px;
          overflow-wrap: anywhere;
        }
        .idle .activity { color: var(--primary-text-color); }
        .summary { font-size: 1.05rem; margin-bottom: 2px; overflow-wrap: anywhere; }
        .facts {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
          font-size: 0.85rem;
          color: var(--secondary-text-color);
        }
        .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .slot { font-size: 0.85rem; color: var(--secondary-text-color); white-space: nowrap; }
        .progress { margin-top: 14px; display: grid; gap: 6px; }
        .progress .labels {
          display: flex; justify-content: space-between;
          font-size: 0.8rem; color: var(--secondary-text-color);
        }
        .next {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid var(--divider-color);
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 0.9rem;
        }
        .next .dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex: 0 0 auto; align-self: center;
        }
        .next .when { color: var(--secondary-text-color); white-space: nowrap; }
        .next .what { font-weight: 600; overflow-wrap: anywhere; }
      </style>
      <ha-card style="--auto-cal-accent: ${escapeHtml(accent)}">
        ${this.config.name ? `<div class="header">${escapeHtml(this.config.name)}</div>` : ""}
        ${this.loadError ? `<div class="error">${escapeHtml(this.loadError)}</div>` : ""}
        ${current ? this.renderCurrent(current, block, now) : this.renderIdle(upcoming, block, now)}
        ${this.config.show_next ? this.renderNext(upcoming, now) : ""}
      </ha-card>
    `;
  }

  private renderCurrent(
    event: ActivityEvent,
    block: ActivityEvent | null,
    now: Date,
  ): string {
    const showSummary =
      this.config.show_details && event.summary && event.summary !== event.label;

    return `
      <div class="top">
        <span class="chip">Now</span>
        <span class="slot">${escapeHtml(formatClock(event.start, this.locale))}–${escapeHtml(
          formatClock(event.end, this.locale),
        )}</span>
      </div>
      <div class="activity">${escapeHtml(event.label)}</div>
      ${showSummary ? `<div class="summary">${escapeHtml(event.summary)}</div>` : ""}
      ${this.config.show_details ? `<div class="facts">${this.facts(event, block)}</div>` : ""}
      ${this.config.show_progress ? this.renderProgress(event, now) : ""}
    `;
  }

  private renderIdle(
    upcoming: ActivityEvent | null,
    block: ActivityEvent | null,
    now: Date,
  ): string {
    const blockLine = block
      ? `You are in the <b>${escapeHtml(block.label)}</b> block until ${escapeHtml(
          formatClock(block.end, this.locale),
        )}`
      : upcoming
        ? `Free for ${escapeHtml(formatDuration(upcoming.start.getTime() - now.getTime()))}`
        : "Nothing scheduled";

    return `
      <div class="idle">
        <div class="top"><span class="chip">Free</span></div>
        <div class="activity">Nothing scheduled</div>
        <div class="facts">${blockLine}</div>
      </div>
    `;
  }

  private renderProgress(event: ActivityEvent, now: Date): string {
    const fraction = progressFraction(event.start, event.end, now);
    const remaining = formatDuration(event.end.getTime() - now.getTime());
    return `
      <div class="progress">
        <div class="bar"><div class="fill" style="width: ${(fraction * 100).toFixed(1)}%"></div></div>
        <div class="labels">
          <span>${escapeHtml(remaining)} left</span>
          <span>${Math.round(fraction * 100)}%</span>
        </div>
      </div>
    `;
  }

  private renderNext(upcoming: ActivityEvent | null, now: Date): string {
    if (!upcoming) return "";
    const color = colorForActivity(upcoming.label, this.config.activity_colors ?? {});
    const inLabel = formatDuration(upcoming.start.getTime() - now.getTime());
    return `
      <div class="next">
        <span class="dot" style="background: ${escapeHtml(color)}"></span>
        <span class="what">${escapeHtml(upcoming.label)}</span>
        <span class="when">${escapeHtml(upcoming.summary && upcoming.summary !== upcoming.label ? `· ${upcoming.summary} ` : "")}· ${escapeHtml(
          formatClock(upcoming.start, this.locale),
        )} (in ${escapeHtml(inLabel)})</span>
      </div>
    `;
  }

  private facts(event: ActivityEvent, block: ActivityEvent | null): string {
    const parts: string[] = [];
    if (event.info.kind) parts.push(escapeHtml(event.info.kind));
    if (event.info.estimatedMinutes !== null) {
      parts.push(`~${escapeHtml(formatDuration(event.info.estimatedMinutes * 60_000))}`);
    }
    if (event.info.priority !== null) {
      parts.push(`Priority ${escapeHtml(event.info.priority)}`);
    }
    if (block && block.label !== event.label) {
      parts.push(`in ${escapeHtml(block.label)}`);
    }
    return parts.map((part) => `<span>${part}</span>`).join("");
  }

  private get locale(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }
}
