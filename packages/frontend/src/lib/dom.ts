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

/** Define a custom element and list it in the Lovelace "Add card" picker. */
export function registerCard(
  element: CustomElementConstructor,
  entry: CustomCardEntry,
): void {
  if (!customElements.get(entry.type)) {
    customElements.define(entry.type, element);
  }
  window.customCards = window.customCards ?? [];
  if (!window.customCards.some((card) => card.type === entry.type)) {
    window.customCards.push(entry);
  }
}

/** Define a helper element (card editors, rows) without picker registration. */
export function defineElement(
  name: string,
  element: CustomElementConstructor,
): void {
  if (!customElements.get(name)) customElements.define(name, element);
}
