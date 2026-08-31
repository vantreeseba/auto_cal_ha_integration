/** CSS shared by every Auto Cal card. */
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--auto-cal-accent) 18%, transparent);
    color: var(--auto-cal-accent);
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color, #db4437);
    font-size: 0.9rem;
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
    inset: 0 auto 0 0;
    border-radius: 3px;
    background: var(--auto-cal-accent);
  }
`;
