/**
 * Bundle entry point — registers every Auto Cal Lovelace card.
 *
 * Home Assistant loads the built file automatically; see
 * custom_components/auto_cal/frontend.py.
 */
import { AutoCalActivityCard } from "./cards/activity-card.js";
import { CALENDAR_ENTITY_SELECTOR, defineEditor } from "./cards/editor.js";
import { AutoCalTimelineCard } from "./cards/timeline-card.js";
import { registerCard } from "./lib/dom.js";

declare const __AUTO_CAL_VERSION__: string;

const DOCS = "https://github.com/vantreeseba/auto_cal_ha_integration#lovelace-cards";

registerCard(AutoCalActivityCard, {
  type: "auto-cal-activity-card",
  name: "Auto Cal: Current Activity",
  description: "What you should be doing right now, from an Auto Cal calendar.",
  preview: true,
  documentationURL: DOCS,
});

registerCard(AutoCalTimelineCard, {
  type: "auto-cal-activity-timeline-card",
  name: "Auto Cal: Activity Timeline",
  description: "Today's Auto Cal schedule as a lane coloured by activity type.",
  preview: true,
  documentationURL: DOCS,
});

defineEditor(
  "auto-cal-activity-card-editor",
  [
    { name: "entity", required: true, selector: CALENDAR_ENTITY_SELECTOR },
    { name: "blocks_entity", selector: CALENDAR_ENTITY_SELECTOR },
    { name: "name", selector: { text: {} } },
    { name: "show_details", selector: { boolean: {} } },
    { name: "show_progress", selector: { boolean: {} } },
    { name: "show_next", selector: { boolean: {} } },
  ],
  {
    entity: "Schedule calendar",
    blocks_entity: "Time blocks calendar (optional)",
    name: "Card title",
    show_details: "Show item details",
    show_progress: "Show progress bar",
    show_next: "Show what's next",
  },
);

defineEditor(
  "auto-cal-timeline-card-editor",
  [
    { name: "entity", required: true, selector: CALENDAR_ENTITY_SELECTOR },
    { name: "blocks_entity", selector: CALENDAR_ENTITY_SELECTOR },
    { name: "name", selector: { text: {} } },
    { name: "start_hour", selector: { number: { min: 0, max: 23, mode: "box" } } },
    { name: "end_hour", selector: { number: { min: 1, max: 24, mode: "box" } } },
    { name: "show_list", selector: { boolean: {} } },
  ],
  {
    entity: "Schedule calendar",
    blocks_entity: "Time blocks calendar (optional)",
    name: "Card title",
    start_hour: "First hour shown",
    end_hour: "Last hour shown",
    show_list: "Show list of remaining items",
  },
);

// eslint-disable-next-line no-console
console.info(
  `%c AUTO-CAL CARDS %c v${__AUTO_CAL_VERSION__} `,
  "color: white; background: #6366f1; font-weight: 700;",
  "color: #6366f1; background: white; font-weight: 700;",
);
