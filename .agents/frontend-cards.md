# Frontend Cards

The repo is an **npm-workspace monorepo**. `packages/frontend` holds the
TypeScript source for the Lovelace cards; the built bundle is committed into
the Python integration, which serves and auto-loads it.

## Why the integration stays at the repo root

HACS resolves an integration repo by looking for `custom_components/<domain>/manifest.json`
at the repository root — it cannot follow a nested workspace path. So
`custom_components/auto_cal/` stays where it is, and only the new JS work lives
under `packages/`.

```
package.json                       # npm workspaces root (scripts: build, dev, test, typecheck)
packages/frontend/
├── build.mjs                      # esbuild → custom_components/auto_cal/www/auto-cal-cards.js
├── src/
│   ├── main.ts                    # entry — registers cards + editors
│   ├── lib/
│   │   ├── activity.ts            # DESCRIPTION / UID parsing  ← the core domain logic
│   │   ├── calendar-api.ts        # /api/calendars fetch + current/next selection
│   │   ├── colors.ts              # stable colour per activity type
│   │   ├── entities.ts            # finds our calendars — ids are host-derived, so match on platform
│   │   ├── time.ts, dom.ts, styles.ts
│   │   └── types.ts               # structural types for the bits of `hass` we touch
│   └── cards/
│       ├── base-card.ts           # config/hass/ticker/fetch/diffed-render plumbing
│       ├── activity-card.ts       # custom:auto-cal-activity-card
│       ├── timeline-card.ts       # custom:auto-cal-activity-timeline-card
│       └── editor.ts              # ha-form based visual editors
└── test/                          # vitest — parsing/selection, entity discovery, card rendering,
                                   #          plus a browser-compat scan of the built bundle
custom_components/auto_cal/
├── frontend.py                    # static path + add_extra_js_url registration
└── www/auto-cal-cards.js          # BUILT ARTIFACT — committed, never hand-edited
```

## Commands

```bash
npm install          # once, at the repo root
npm run build        # rebuild custom_components/auto_cal/www/auto-cal-cards.js
npm run dev          # esbuild watch mode
npm test             # vitest
npm run typecheck    # tsc --noEmit
```

The bundle is **committed** so HACS and manual installs need no Node toolchain.
CI rebuilds it and fails if the committed file differs from the source.

## How the cards reach the browser

`async_setup_entry` calls `async_register_cards()` (once per HA instance):

1. `hass.http.async_register_static_paths()` serves the bundle at `/auto_cal/auto-cal-cards.js`
2. `add_extra_js_url()` makes the frontend load it on every dashboard

`frontend` and `http` are `after_dependencies` (not hard ones) so the
integration still loads where the frontend is absent — and so the test suite
does not have to set up `hass_frontend`. Both failure paths degrade to a
warning; setup never fails because of the cards.

Bump `manifest.json` `version` to cache-bust the browser copy — the URL carries
`?v=<manifest version>`.

## Browser support — keep it boring

A dashboard is opened from wherever it is mounted: old Fire tablets, hand-me-down
iPads, the companion app's WebView, a TV browser. Those engines are years behind
the desktop Chrome the cards get written in, and a single unsupported *syntax*
token means the whole bundle fails to parse — every card on the dashboard
becomes "Custom element doesn't exist", not just the new feature.

So:

- **Build target is `es2015`** (`build.mjs`). Write modern TypeScript freely —
  esbuild lowers `?.`, `??`, `??=`, spread and async for you. What it cannot
  lower is *library* methods, so avoid `Array.prototype.flat`/`flatMap`,
  `replaceAll`, `Object.hasOwn`, `structuredClone` and friends.
- **CSS sticks to long-supported properties.** Notably, flex `gap` is ignored
  before Safari 14.1, so spacing is written as margins (`> * + * { margin-… }`).
  Anything newer goes behind `@supports` with a plain fallback — see `.chip`
  in `lib/styles.ts`, which is a solid accent chip everywhere and a tinted one
  where `color-mix()` exists.
- **Dates are parsed with `parseDateString()`.** Only strict ISO is portable;
  Safari returns `Invalid Date` for the space-separated and `+0000` forms Home
  Assistant hands out. Events that fail to parse are dropped rather than
  rendered as `NaN%`-wide segments.
- **Nothing fails loudly.** `registerCard()` swallows a failed definition so
  the other card still works, and `render()` catches template errors and paints
  the message into the card.

`test/bundle-compat.test.ts` scans the committed bundle for the forbidden
tokens, so a target bump or a stray modern method fails CI rather than a user's
tablet.

## Where the activity comes from

The calendar entities are built from Auto Cal's iCal feed, which encodes item
metadata in the event `DESCRIPTION`:

```
Type: Todo
Activity: Work
Priority: 80
Estimated: 60 min
```

`parseDescription()` lifts those out; `toActivityEvent()` picks the label the
cards headline:

| Feed | Label shown |
|------|-------------|
| Schedule (`ical_events`) | `Activity:` line — the activity **type** |
| Time Blocks (`block_events`) | the event SUMMARY — a block *is* an activity |

Activity colours are **not** in the iCal feed (only in GraphQL `activityType { color }`),
so `colorForActivity()` hashes the name to a stable hue. Users can pin exact
colours with the `activity_colors:` config option.

## Cards

| Card | Config | Notes |
|------|--------|-------|
| `custom:auto-cal-activity-card` | `entity` (required), `blocks_entity`, `name`, `show_details`, `show_progress`, `show_next`, `activity_colors` | Current activity, progress through the slot, what's next |
| `custom:auto-cal-activity-timeline-card` | `entity` (required), `blocks_entity`, `name`, `start_hour`, `end_hour`, `show_list`, `activity_colors` | Today as a lane coloured by activity, with a now-marker |

### Finding the calendars

Entity ids are slugified from the config entry title, which is the Auto Cal
**host** — `calendar.auto_cal_local_4000_schedule`, or
`calendar.192_168_1_10_4000_schedule` for an IP. Nothing in the id is
guaranteed to contain "auto_cal", so `getStubConfig()` (and anything else
looking for our entities) must go through `findAutoCalCalendars()`, which
matches `hass.entities[id].platform === "auto_cal"` and only falls back to
name matching when the registry is unavailable. Never match on the id text.

Both extend `AutoCalBaseCard`, which handles: config validation, re-fetching
when a tracked calendar entity changes (and at most every 5 min), a 15 s ticker
for the countdown, and diffed `innerHTML` rendering.

## Extension seams

The cards are read-only today. The pieces that make write actions cheap to add:

- **`parseItemId(uid)`** already reduces `todo-1-2026-05-13@auto-cal` → `todo-1`,
  which is the same id the `todo` platform uses as `TodoItem.uid`. Completing the
  current calendar item is therefore:
  `hass.callService("todo", "update_item", { item: itemId, status: "completed" }, { entity_id: <list entity> })`
  — the open question is *which* list entity, which needs a `todo/item/list`
  WebSocket lookup across the Auto Cal todo entities (or a new integration-side
  service that takes just the item id).
- **`AutoCalBaseCard.afterRender()`** is where buttons get their listeners; the
  base class already re-renders on coordinator-driven state changes.
- A **pomodoro** card would want state that outlives a render: put it on the
  element instance (not the DOM), and drive the countdown from the existing
  ticker rather than a second interval.
