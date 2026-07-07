# Auto Cal — Home Assistant Integration

[![CI](https://github.com/vantreeseba/auto_cal_ha_integration/actions/workflows/ci.yml/badge.svg)](https://github.com/vantreeseba/auto_cal_ha_integration/actions/workflows/ci.yml)

A [Home Assistant](https://www.home-assistant.io/) integration for [Auto Cal](https://github.com/vantreeseba/auto-cal) — a smart todo and habit scheduling app that automatically schedules tasks into your calendar based on priority and activity type.

## What It Does

| Platform | Entities | Source |
|----------|----------|--------|
| **Calendar** | One `calendar` entity showing your scheduled week | Auto Cal's `/ical` endpoint |
| **To-do lists** | One `todo` entity per Auto Cal list (e.g. Work, Personal) | Auto Cal's GraphQL API |
| **Habits** | One device per habit — a **Log completion** button, **Progress** + **Completion rate** sensors, and a **Goal met** binary sensor | Auto Cal's GraphQL API |

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

## Options

To change the server URL or API key after setup, go to **Settings → Devices & Services**, find Auto Cal, and click **Configure**.

## Troubleshooting

**"Invalid or expired API key"** — The key was revoked or expired. Generate a new one in Auto Cal's Settings page.

**"Failed to connect"** — Check that the Auto Cal server is running and that the URL is reachable from the machine running Home Assistant. Try opening `http://<your-url>/graphql` in a browser on the same network.

**Calendar shows no events** — Auto Cal only schedules items that have a matching time block and an `estimatedLength > 0`. Check that your todos are assigned to a list with an activity type, and that you have time blocks defined for that activity type.

**Todo list is empty** — Verify the API key has `read` scope and that the list exists in Auto Cal.

## Development

```bash
# Install test dependencies (requires Python 3.14)
pip install ".[test]"

# Run tests
pytest
```

See [AGENTS.md](AGENTS.md) for architecture details, API reference, and contributing guidelines.

## License

MIT
