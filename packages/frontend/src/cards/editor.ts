/**
 * Visual editors for the cards.
 *
 * They lean on Home Assistant's own `<ha-form>`, so the entity pickers and
 * toggles match every other card editor. Rendered in the light DOM so the
 * dialog's theme applies.
 */
import { defineElement, fireEvent } from "../lib/dom.js";
import type { Hass, LovelaceCardConfig } from "../lib/types.js";

export interface FormSchemaItem {
  name: string;
  required?: boolean;
  selector: Record<string, unknown>;
}

interface HaFormElement extends HTMLElement {
  hass?: Hass;
  data?: Record<string, unknown>;
  schema?: FormSchemaItem[];
  computeLabel?: (item: FormSchemaItem) => string;
}

export function defineEditor(
  tagName: string,
  schema: FormSchemaItem[],
  labels: Record<string, string>,
): void {
  class AutoCalCardEditor extends HTMLElement {
    private config: LovelaceCardConfig = { type: "" };
    private hassObj?: Hass;
    private form?: HaFormElement;

    setConfig(config: LovelaceCardConfig): void {
      this.config = config;
      this.render();
    }

    set hass(hass: Hass) {
      this.hassObj = hass;
      this.render();
    }

    connectedCallback(): void {
      this.render();
    }

    private render(): void {
      if (!this.hassObj) return;

      if (!this.form) {
        const form = document.createElement("ha-form") as HaFormElement;
        form.schema = schema;
        form.computeLabel = (item) => labels[item.name] ?? item.name;
        form.addEventListener("value-changed", (event) => {
          const detail = (event as CustomEvent<{ value: LovelaceCardConfig }>).detail;
          fireEvent(this, "config-changed", { config: detail.value });
        });
        this.form = form;
        this.append(form);
      }

      this.form.hass = this.hassObj;
      this.form.data = this.config as unknown as Record<string, unknown>;
    }
  }

  defineElement(tagName, AutoCalCardEditor);
}

export const CALENDAR_ENTITY_SELECTOR = {
  entity: { filter: [{ domain: "calendar" }] },
};
