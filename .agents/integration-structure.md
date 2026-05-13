# Integration Structure

## File Layout

```
custom_components/auto_cal/
├── __init__.py          # async_setup_entry / async_unload_entry
├── manifest.json        # domain, requirements (icalendar), config_flow: true
├── const.py             # DOMAIN, CONF_URL, CONF_API_KEY, DEFAULT_SCAN_INTERVAL
├── config_flow.py       # ConfigFlow + OptionsFlow (url + api_key fields)
├── coordinator.py       # AutoCalCoordinator(DataUpdateCoordinator)
├── api.py               # AutoCalApiClient — all HTTP/GraphQL calls
├── calendar.py          # AutoCalCalendarEntity(CoordinatorEntity, CalendarEntity)
├── todo.py              # AutoCalTodoListEntity(CoordinatorEntity, TodoListEntity)
├── strings.json         # UI strings (referenced by translations/en.json)
└── translations/
    └── en.json          # English translations for config flow

tests/
├── __init__.py
├── conftest.py          # hass fixture, mock config entry, mock coordinator
├── test_config_flow.py  # config flow success + error paths
├── test_coordinator.py  # coordinator data fetching + error handling
├── test_calendar.py     # calendar entity event parsing + filtering
└── test_todo.py         # todo CRUD — create, update, complete, uncomplete
```

## Platform Map

| Platform | Entity | Count | Source |
|----------|--------|-------|--------|
| `calendar` | `AutoCalCalendarEntity` | 1 per entry | `/ical?secret=<key>` |
| `todo` | `AutoCalTodoListEntity` | 1 per list | `myTodos(listId:)` GraphQL |

## Entity Hierarchy

```
ConfigEntry
  └── AutoCalCoordinator (15-min poll)
        ├── AutoCalCalendarEntity  (calendar platform)
        └── AutoCalTodoListEntity × N  (todo platform, one per list)
```

## Data Flow

```
_async_update_data()
  ├── client.get_todo_lists()   → coordinator.data["todo_lists"]
  ├── client.get_todos()        → coordinator.data["todos_by_list"]
  └── client.get_ical()         → coordinator.data["ical_events"] (parsed)
```

## Coordinator Data Shape

```python
{
    "todo_lists": list[dict],           # from myTodoLists query
    "todos_by_list": dict[str, list[dict]],  # list_id → todos
    "ical_events": list[dict],          # [{uid, summary, start, end, description}]
}
```
