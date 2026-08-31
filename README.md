# Auto Cal — Home Assistant Integration

[![CI](https://github.com/vantreeseba/auto_cal_ha_integration/actions/workflows/ci.yml/badge.svg)](https://github.com/vantreeseba/auto_cal_ha_integration/actions/workflows/ci.yml)

A [Home Assistant](https://www.home-assistant.io/) integration for [Auto Cal](https://github.com/vantreeseba/auto-cal) — a smart todo and habit scheduling app that automatically schedules tasks into your calendar based on priority and activity type.

## What It Does

| Platform | Entities | Source |
|----------|----------|--------|
| **Calendar** | One `calendar` entity showing your scheduled week | Auto Cal's `/ical` endpoint |
| **To-do lists** | One `todo` entity per Auto Cal list (e.g. Work, Personal) | Auto Cal's GraphQL API |
| **Habits** | One device per habit — a **Log completion** button, **Progress** + **Completion rate** sensors, and a **Goal met** binary sensor | Auto Cal's GraphQL API |
| **Lovelace cards** | A **Current Activity** card and an **Activity Timeline** card, installed with the integration | The calendar entities above |

The calendar shows all todos and habits Auto Cal has scheduled for the current and next ISO week. Each todo list is a fully interactive HA to-do list — you can add, rename, complete, and set due dates without leaving Home Assistant. Each habit becomes its own device you can log completions on and track against its weekly/monthly goal.

## Prerequisites

- A running [Auto Cal](https://github.com/vantreeseba/auto-cal) instance reachable from your Home Assistant host
- An Auto Cal API key with at least **read** scope (write scope required for creating/updating todos)

### Generating an API Key

1. Open Auto Cal in your browser and go to **Settings → API Keys**
2. Click **Create API Key**, give it a name (e.g. `Home Assistant`), and choose scopes:
   - `read` — lets HA fetch your calendar, todo lists, and habits
   - `write` — additionally lets HA create/complete/delete todos and log habit completions
3. Copy the `acal_…` token — it is shown **once** and cannot be retrieved again

## Installation

### HACS (recommended)

1. In Home Assistant, open **HACS → Integrations**
2. Click the three-dot menu → **Custom repositories**
3. Add `https://github.com/vantreeseba/auto_cal_ha_integration` with category **Integration**
4. Search for **Auto Cal** and install it
5. Restart Home Assistant

### Manual

1. Copy the `custom_components/auto_cal` folder into your HA `config/custom_components/` directory
2. Restart Home Assistant

## Configuration

1. Go to **Settings → Devices & Services → Add Integration**
2. Search for **Auto Cal**
3. Enter your Auto Cal server URL (e.g. `http://192.168.1.10:4000`) and your API key

The integration polls every 15 minutes. You can trigger an immediate refresh from the integration card.

## Supported Features

### Calendar

- Shows all scheduled todos and habits for the current and next ISO week
- Events include the item title, activity type, estimated duration, and priority
- Note: the calendar is read-only and limited to the two-week window Auto Cal schedules ahead

### To-do Lists

| Action | Supported |
|--------|-----------|
| View items | ✅ |
| Create item | ✅ (requires `write` scope) |
| Rename item | ✅ (requires `write` scope) |
| Set due date/time | ✅ (requires `write` scope) |
| Set description | ✅ (requires `write` scope) |
| Complete / uncomplete | ✅ (requires `write` scope) |
| Delete item | ✅ (requires `write` scope) — also clears completed items |
| Reorder items | ❌ |

### Habits

Each Auto Cal habit is exposed as its own device with these entities:

| Entity | Type | Description |
|--------|------|-------------|
| **Log completion** | `button` | Records a completion now (requires `write` scope) |
| **Progress** | `sensor` | Completions logged this period; attributes include `target`, `remaining`, `frequency_unit`, `activity_type` |
| **Completion rate** | `sensor` | Trailing completion rate (%) across recent periods |
| **Goal met** | `binary_sensor` | `on` once completions reach the habit's target for the current period |

Habit changes made outside Home Assistant appear on the next 15-minute poll; pressing **Log completion** refreshes immediately. Habits also appear on the **Calendar** when Auto Cal schedules them.

## Lovelace Cards

The integration ships two custom cards and registers them automatically — no
Lovelace resource to add. After restarting Home Assistant they appear in the
**Add card** picker under *Auto Cal* (hard-refresh the browser once if not).

### Current Activity

Answers "what should I be doing right now?" — the activity type of whatever Auto
Cal has scheduled for this moment, shown large, with the item, how much of the
slot is left, and what's next.

```yaml
type: custom:auto-cal-activity-card
entity: calendar.auto_cal_schedule
blocks_entity: calendar.auto_cal_time_blocks   # optional — shows the surrounding block
```

| Option | Default | Description |
|--------|---------|-------------|
| `entity` | *required* | Auto Cal **Schedule** calendar entity |
| `blocks_entity` | — | Auto Cal **Time Blocks** calendar; used as context, and as the fallback activity when nothing is scheduled |
| `name` | — | Optional card title |
| `show_details` | `true` | Item title, Todo/Habit, estimate, priority |
| `show_progress` | `true` | Progress bar + time remaining in the slot |
| `show_next` | `true` | "Up next" line |
| `activity_colors` | — | Map of activity name → colour, e.g. `{Work: "#6366f1"}` |

### Activity Timeline

Today's schedule as a single lane coloured by activity type, with a marker at
the current time and a list of what is left.

```yaml
type: custom:auto-cal-activity-timeline-card
entity: calendar.auto_cal_schedule
blocks_entity: calendar.auto_cal_time_blocks
start_hour: 7
end_hour: 22
```

Activity colours are derived from the activity name (the iCal feed doesn't carry
Auto Cal's colours), so they're stable but arbitrary — pin the ones you care
about with `activity_colors`.

## Options

To change the server URL or API key after setup, go to **Settings → Devices & Services**, find Auto Cal, and click **Configure**.

## Troubleshooting

**"Invalid or expired API key"** — The key was revoked or expired. Generate a new one in Auto Cal's Settings page.

**"Failed to connect"** — Check that the Auto Cal server is running and that the URL is reachable from the machine running Home Assistant. Try opening `http://<your-url>/graphql` in a browser on the same network.

**Calendar shows no events** — Auto Cal only schedules items that have a matching time block and an `estimatedLength > 0`. Check that your todos are assigned to a list with an activity type, and that you have time blocks defined for that activity type.

**Todo list is empty** — Verify the API key has `read` scope and that the list exists in Auto Cal.

## Development

This repo is a small monorepo: the Python integration lives at
`custom_components/auto_cal/` (where HACS expects it) and the card source lives
at `packages/frontend/`, built into `custom_components/auto_cal/www/`.

```bash
# Integration (requires Python 3.14)
pip install ".[test]"
pytest

# Cards
npm install
npm run build      # rebuild custom_components/auto_cal/www/auto-cal-cards.js
npm run dev        # watch mode
npm test
```

The built bundle is committed so installs need no Node toolchain — rebuild and
commit it whenever you change `packages/frontend/src`.

See [AGENTS.md](AGENTS.md) for architecture details, API reference, and contributing guidelines.

## License

MIT
