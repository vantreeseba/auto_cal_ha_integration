/** Tiny DOM helpers — the cards render HTML strings into a shadow root. */

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fire a DOM event the Home Assistant frontend listens for. */
export function fireEvent<T>(target: HTMLElement, type: string, detail?: T): void {
  target.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
}

/** Open Home Assistant's more-info dialog for an entity. */
export function showMoreInfo(target: HTMLElement, entityId: string): void {
  fireEvent(target, "hass-more-info", { entityId });
}

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
    loadCardHelpers?: () => Promise<unknown>;
  }
}

/**
 * Define a custom element and list it in the Lovelace "Add card" picker.
 *
 * Registration is guarded so that one card failing to define (a duplicate
 * name, a browser that rejects the definition) still leaves the others usable.
 */
export function registerCard(
  element: CustomElementConstructor,
  entry: CustomCardEntry,
): void {
  if (!defineElement(entry.type, element)) return;
  window.customCards = window.customCards ?? [];
  if (!window.customCards.some((card) => card.type === entry.type)) {
    window.customCards.push(entry);
  }
}

/**
 * Define a helper element (card editors, rows) without picker registration.
 *
 * Returns false if the element is not available for use afterwards.
 */
export function defineElement(
  name: string,
  element: CustomElementConstructor,
): boolean {
  try {
    if (!customElements.get(name)) customElements.define(name, element);
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`auto-cal: could not define <${name}>`, err);
    return false;
  }
}
