# Project: Auto Cal — Home Assistant Integration

A Home Assistant custom integration that connects to an [Auto Cal](../auto-cal) instance to surface:
- **Calendar** — reads the `/ical` endpoint (current + next week of scheduled todos and habits)
- **Todo lists** — reads/writes todo lists and items via the GraphQL API
- **Habits** — one device per habit exposing a "Log completion" button, progress + completion-rate sensors, and a "Goal met" binary sensor (GraphQL `myHabits` / `myHabitDetail` / `myCompleteHabit`)

Tracks auto-cal **v1.16.0**. Users configure a server URL and an `acal_` API key (generated in Auto Cal's Settings page).

## Commands

```bash
# Install test dependencies
pip install -e ".[test]"

# Run tests
pytest

# Type checking
mypy custom_components/auto_cal/

# Lint
ruff check custom_components/ tests/
```

## Tech Stack

| Choice | Why |
|--------|-----|
| **aiohttp** | HA's standard async HTTP client; reuse HA's session via `async_get_clientsession` |
| **icalendar** | Parse iCal feeds; listed in manifest.json `requirements` so HA installs it |
| **DataUpdateCoordinator** | Single shared poller for all entities; 15-min default interval |

## Key Conventions

- All config stored in `entry.data` (`url`, `api_key`)
- `entry.runtime_data` holds the typed `AutoCalData(coordinator=...)` dataclass
- `AutoCalApiClient` owns all HTTP — coordinator calls client methods, entities call coordinator
- GraphQL auth: `Authorization: Bearer <api_key>` header
- iCal auth: `?secret=<api_key>` query param

## Guard clauses

Raise `AutoCalConnectionError` for network failures, `AutoCalAuthError` for 401/403. Config flow maps these to `cannot_connect` / `invalid_auth` errors.

## Agent File Convention

All planning, structure, and API reference docs live in `.agents/`. Always add new files to the reference list below.

## Agent Reference Files

- [`.agents/integration-structure.md`](.agents/integration-structure.md) — File layout, platform map, entity hierarchy
- [`.agents/api-reference.md`](.agents/api-reference.md) — GraphQL queries/mutations and iCal endpoint used by this integration
