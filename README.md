# Auto Cal — Home Assistant Integration

[![CI](https://github.com/vantreeseba/auto_cal_ha_integration/actions/workflows/ci.yml/badge.svg)](https://github.com/vantreeseba/auto_cal_ha_integration/actions/workflows/ci.yml)

A [Home Assistant](https://www.home-assistant.io/) integration for [Auto Cal](https://github.com/vantreeseba/auto-cal) — a smart todo and habit scheduling app that automatically schedules tasks into your calendar based on priority and activity type.

## What It Does

| Platform | Entities | Source |
|----------|----------|--------|
| **Calendar** | Two `calendar` entities — **Schedule** (what's scheduled) and **Time Blocks** (your recurring blocks) | Auto Cal's `/ical` endpoint |
| **To-do lists** | One `todo` entity per Auto Cal list (e.g. Work, Personal) | Auto Cal's GraphQL API |
| **Habits** | One device per habit — a **Log completion** button, **Progress** + **Completion rate** sensors, and a **Goal met** binary sensor | Auto Cal's GraphQL API |
| **Lovelace cards** | A **Current Activity** card and an **Activity Timeline** card, installed with the integration | The calendar entities above |

The Schedule calendar shows all todos and habits Auto Cal has scheduled for the current and next ISO week. Each todo list is a fully interactive HA to-do list — you can add, rename, complete, and set due dates without leaving Home Assistant. Each habit becomes its own device you can log completions on and track against its weekly/monthly goal.

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

### Entity Names

Entity IDs are derived from the server you configured, so they differ per
install. For a server at `http://auto-cal.local:4000` you get:

```
calendar.auto_cal_local_4000_schedule
calendar.auto_cal_local_4000_time_blocks
todo.auto_cal_local_4000_work          # one per Auto Cal list
sensor.exercise_progress               # habits are named after the habit
button.exercise_log_completion
```

With an IP address (`http://192.168.1.10:4000`) they become
`calendar.192_168_1_10_4000_schedule`, and so on. Check **Settings → Devices &
Services → Auto Cal → entities** for yours, or rename them there — the Lovelace
cards below pick the right entities for you either way.

## Supported Features

### Calendar

Two calendars are created:

- **Schedule** — all scheduled todos and habits for the current and next ISO week. Events carry the item title, activity type, estimated duration, and priority.
- **Time Blocks** — your recurring Auto Cal time blocks (Deep Work, Errands, …), expanded from their weekly recurrence rules. Useful as background context for what a given hour is *for*, even when nothing is scheduled in it.

Both are read-only, and the Schedule calendar is limited to the two-week window Auto Cal schedules ahead.

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

The integration ships two custom cards and registers them automatically — there
is no Lovelace resource to add and nothing to copy into `www/`. After restarting
Home Assistant, open a dashboard, click **Edit → Add card**, and search for
*Auto Cal*. Both cards have a visual editor that lists your Auto Cal calendars,
so you normally never type an entity ID.

The YAML below is what those editors produce. Entity IDs come from your server
host (see [Entity Names](#entity-names)) — substitute your own.

### Current Activity

Answers "what should I be doing right now?" — the activity type of whatever Auto
Cal has scheduled for this moment, shown large, with the item, how much of the
slot is left, and what's next.

```yaml
type: custom:auto-cal-activity-card
entity: calendar.auto_cal_local_4000_schedule
# optional — falls back to the surrounding time block when nothing is scheduled
blocks_entity: calendar.auto_cal_local_4000_time_blocks
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
entity: calendar.auto_cal_local_4000_schedule
blocks_entity: calendar.auto_cal_local_4000_time_blocks
start_hour: 7
end_hour: 22
```

| Option | Default | Description |
|--------|---------|-------------|
| `entity` | *required* | Auto Cal **Schedule** calendar entity |
| `blocks_entity` | — | Auto Cal **Time Blocks** calendar; drawn as a faint lane behind the schedule |
| `name` | `Today` | Card title |
| `start_hour` / `end_hour` | auto | Clamp the lane to these local hours. Set **both** or neither — left unset, the lane covers 7:00–22:00 widened to fit the day's events |
| `show_list` | `true` | List of the items still ahead today |
| `activity_colors` | — | Map of activity name → colour |

Activity colours are derived from the activity name (the iCal feed doesn't carry
Auto Cal's colours), so they're stable but arbitrary — pin the ones you care
about with `activity_colors`:

```yaml
activity_colors:
  Work: "#6366f1"
  Exercise: "#22c55e"
```

Both cards read the calendars through Home Assistant's calendar API, so they
work on any dashboard and on the companion app without extra setup.

## Options

To change the server URL or API key after setup, go to **Settings → Devices & Services**, find Auto Cal, and click **Configure**.

## Troubleshooting

**"Invalid or expired API key"** — The key was revoked or expired. Generate a new one in Auto Cal's Settings page.

**"Failed to connect"** — Check that the Auto Cal server is running and that the URL is reachable from the machine running Home Assistant. Try opening `http://<your-url>/graphql` in a browser on the same network.

**Calendar shows no events** — Auto Cal only schedules items that have a matching time block and an `estimatedLength > 0`. Check that your todos are assigned to a list with an activity type, and that you have time blocks defined for that activity type.

**Todo list is empty** — Verify the API key has `read` scope and that the list exists in Auto Cal.

**Cards don't show up in the card picker** — Restart Home Assistant after installing or updating (the cards are registered during integration setup), then hard-refresh the browser (Ctrl/Cmd+Shift+R) to clear the cached frontend. If a card shows *Custom element doesn't exist*, check **Settings → System → Logs** for an `auto_cal` warning about the missing card bundle.

**A card says "Entity not found"** — The entity ID changed because the server URL changed. Pick the calendar again in the card's visual editor.

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
