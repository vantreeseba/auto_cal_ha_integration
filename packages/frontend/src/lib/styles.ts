/**
 * CSS shared by every Auto Cal card.
 *
 * Kept to widely-supported properties: dashboards run on old tablets and
 * embedded WebViews as often as on a desktop Chrome. Where a modern property
 * is genuinely nicer (`color-mix`) it goes behind `@supports` with a plain
 * fallback, and flex/grid `gap` is spelled out as margins because Safari
 * before 14.1 ignores gap in flex containers.
 */
export const BASE_STYLES = /* css */ `
  :host {
    --auto-cal-accent: var(--primary-color);
    display: block;
  }
  ha-card {
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
  }
  .header {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
    margin-bottom: 8px;
  }
  .chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--auto-cal-accent);
    color: var(--text-primary-color, #fff);
  }
  @supports (background: color-mix(in srgb, red 50%, transparent)) {
    .chip {
      background: color-mix(in srgb, var(--auto-cal-accent) 18%, transparent);
      color: var(--auto-cal-accent);
    }
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color, #db4437);
    font-size: 0.9rem;
  }
  .wrap {
    word-break: break-word;
    overflow-wrap: break-word;
  }
  .bar {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .bar > .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: 3px;
    background: var(--auto-cal-accent);
  }
`;
