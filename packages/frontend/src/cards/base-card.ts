/**
 * Shared plumbing for the Auto Cal cards: config handling, event fetching,
 * a countdown ticker, and diffed rendering into a shadow root.
 *
 * Subclasses implement `template()` and declare which calendar entities they
 * read via `entityIds()`.
 */
import { fetchActivityEvents } from "../lib/calendar-api.js";
import { escapeHtml } from "../lib/dom.js";
import { BASE_STYLES } from "../lib/styles.js";
import type { ActivityEvent, Hass, LovelaceCardConfig } from "../lib/types.js";

/** How often the visible countdown / progress bar is recomputed. */
const TICK_MS = 15_000;
/** How often calendar events are re-fetched even if nothing changed. */
const REFETCH_MS = 5 * 60_000;

export abstract class AutoCalBaseCard<
  TConfig extends LovelaceCardConfig,
> extends HTMLElement {
  protected config!: TConfig;
  protected hassObj?: Hass;
  protected events: ActivityEvent[] = [];
  protected loadError: string | null = null;

  private root: ShadowRoot;
  private ticker?: ReturnType<typeof setInterval>;
  private lastHtml = "";
  private lastFetchAt = 0;
  private lastStateStamp = "";
  private fetching = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  // -- Lovelace contract ------------------------------------------------

  setConfig(config: TConfig): void {
    this.config = this.validateConfig(config);
    this.lastFetchAt = 0;
    this.lastHtml = "";
    this.refresh();
  }

  set hass(hass: Hass) {
    this.hassObj = hass;
    // Calendar entities bump last_changed when their current event rolls over,
    // which is our cue that the cached window is stale.
    const stamp = this.entityIds()
      .map((id) => hass.states[id]?.last_changed ?? "?")
      .join("|");
    const staleWindow = Date.now() - this.lastFetchAt > REFETCH_MS;

    if (stamp !== this.lastStateStamp || staleWindow) {
      this.lastStateStamp = stamp;
      this.refresh();
    } else {
      this.render();
    }
  }

  get hass(): Hass | undefined {
    return this.hassObj;
  }

  connectedCallback(): void {
    if (this.ticker === undefined) {
      this.ticker = setInterval(() => this.onTick(), TICK_MS);
    }
    this.render();
  }

  disconnectedCallback(): void {
    clearInterval(this.ticker);
    this.ticker = undefined;
  }

  // -- Subclass hooks ---------------------------------------------------

  /** Throw a user-facing Error for invalid YAML; return the resolved config. */
  protected abstract validateConfig(config: TConfig): TConfig;

  /** Calendar entities this card reads. */
  protected abstract entityIds(): string[];

  /** The window of events to load, relative to now. */
  protected abstract range(now: Date): { start: Date; end: Date };

  /** Full HTML for the shadow root, including a `<style>` block. */
  protected abstract template(now: Date): string;

  /** Called after each render so subclasses can wire up listeners. */
  protected afterRender(): void {}

  // -- Internals --------------------------------------------------------

  private onTick(): void {
    if (Date.now() - this.lastFetchAt > REFETCH_MS) {
      this.refresh();
    } else {
      this.render();
    }
  }

  protected refresh(): void {
    // Paint what we already know (cached events, entity attributes) so the
    // card is never blank while the fetch is in flight.
    this.render();
    void this.loadEvents();
  }

  private async loadEvents(): Promise<void> {
    const hass = this.hassObj;
    const entityIds = this.config ? this.entityIds() : [];
    if (!hass || !entityIds.length || this.fetching) return;

    this.fetching = true;
    const now = new Date();
    const { start, end } = this.range(now);
    try {
      this.events = await fetchActivityEvents(hass, entityIds, start, end);
      this.loadError = null;
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
    } finally {
      this.fetching = false;
      this.lastFetchAt = Date.now();
      this.render();
    }
  }

  protected render(): void {
    if (!this.config) return;
    let html: string;
    try {
      html = this.template(new Date());
    } catch (err) {
      // Never leave a blank card behind: show what went wrong instead.
      html = `<style>${BASE_STYLES}</style><ha-card><div class="error">${escapeHtml(
        err instanceof Error ? err.message : String(err),
      )}</div></ha-card>`;
    }
    if (html === this.lastHtml) return;
    this.lastHtml = html;
    this.root.innerHTML = html;
    try {
      this.afterRender();
    } catch {
      // A failed listener hookup must not take the rendered card with it.
    }
  }

  protected query<T extends Element>(selector: string): T | null {
    return this.root.querySelector<T>(selector);
  }

  protected queryAll<T extends Element>(selector: string): T[] {
    return Array.from(this.root.querySelectorAll<T>(selector));
  }
}
