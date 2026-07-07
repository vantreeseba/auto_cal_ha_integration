# Integration Structure

## File Layout

```
custom_components/auto_cal/
├── __init__.py          # async_setup_entry / async_unload_entry
├── manifest.json        # domain, requirements (icalendar), config_flow: true
├── const.py             # DOMAIN, CONF_*, DEFAULT_SCAN_INTERVAL, PLATFORMS, HABIT_DETAIL_PERIODS
├── config_flow.py       # ConfigFlow + OptionsFlow (url + api_key fields)
├── coordinator.py       # AutoCalCoordinator(DataUpdateCoordinator) + habit progress summary
├── api.py               # AutoCalApiClient — all HTTP/GraphQL calls
├── entity.py            # AutoCalHabitEntity — shared base (one HA device per habit)
├── calendar.py          # AutoCalCalendarEntity (Schedule) + AutoCalTimeBlocksEntity (recurring blocks)
├── todo.py              # AutoCalTodoListEntity(CoordinatorEntity, TodoListEntity)
├── button.py            # AutoCalHabitCompleteButton — "Log completion" per habit
├── sensor.py            # AutoCalHabitProgressSensor + AutoCalHabitRateSensor per habit
├── binary_sensor.py     # AutoCalHabitGoalMetBinarySensor per habit
├── strings.json         # UI strings (referenced by translations/en.json)
└── translations/
    └── en.json          # English translations for config flow

tests/
├── __init__.py
├── conftest.py          # hass fixture, mock config entry, mock client (todos + habits)
├── test_config_flow.py  # config flow success + error paths
├── test_coordinator.py  # coordinator data fetching, habit progress, error handling
├── test_calendar.py     # calendar entity event parsing + filtering
├── test_todo.py         # todo CRUD — create, update, complete, delete
└── test_habit.py        # habit button + progress/rate sensors + goal-met binary sensor
```

## Platform Map

| Platform | Entity | Count | Source |
|----------|--------|-------|--------|
| `calendar` | `AutoCalCalendarEntity` (Schedule) | 1 per entry | `/ical?secret=<key>` (todos + habits) |
| `calendar` | `AutoCalTimeBlocksEntity` (Time Blocks) | 1 per entry | `/ical?secret=<key>&view=blocks` (recurring RRULE blocks) |
| `todo` | `AutoCalTodoListEntity` | 1 per list | `myTodos(listId:)` GraphQL |
| `button` | `AutoCalHabitCompleteButton` | 1 per habit | `myCompleteHabit` on press |
| `sensor` | `AutoCalHabitProgressSensor`, `AutoCalHabitRateSensor` | 2 per habit | `myHabits` + `myHabitDetail` |
| `binary_sensor` | `AutoCalHabitGoalMetBinarySensor` | 1 per habit | `myHabitDetail` (completions ≥ target) |

Each habit gets its own HA **device** (`via_device` → the config entry's device), grouping its button + sensors together.

## Entity Hierarchy

```
ConfigEntry
  └── AutoCalCoordinator (15-min poll)
        ├── AutoCalCalendarEntity        (calendar platform — Schedule)
        ├── AutoCalTimeBlocksEntity      (calendar platform — Time Blocks)
        ├── AutoCalTodoListEntity × N     (todo platform, one per list)
        └── per habit (device):           (button/sensor/binary_sensor platforms)
              ├── AutoCalHabitCompleteButton
              ├── AutoCalHabitProgressSensor
              ├── AutoCalHabitRateSensor
              └── AutoCalHabitGoalMetBinarySensor
```

## Data Flow

```
_async_update_data()
  ├── client.get_todo_lists()   → coordinator.data["todo_lists"]
  ├── client.get_todos()        → coordinator.data["todos_by_list"]
  ├── client.get_ical()         → coordinator.data["ical_events"] (parsed)
  ├── _async_fetch_blocks()     → coordinator.data["block_events"] (RRULE defs)
  │     └── client.get_ical_blocks()  (degrades to [] if view=blocks unsupported)
  └── _async_fetch_habits()     → coordinator.data["habits"] + ["habit_progress"]
        ├── client.get_habits()                → habit list (static fields)
        └── client.get_habit_detail(id) × N    → summarized per-habit progress
        (degrades to empty on AutoCalApiError so todos/calendar still work)
```

## Coordinator Data Shape

```python
{
    "todo_lists": list[dict],           # from myTodoLists query
    "todos_by_list": dict[str, list[dict]],  # list_id → todos
    "ical_events": list[dict],          # [{uid, summary, start, end, description}]
    "block_events": list[dict],         # [{uid, summary, start, end, description, rrule}]
                                        #   RRULE templates; expanded per-range in calendar.py
    "habits": list[dict],               # from myHabits query
    "habit_progress": dict[str, dict],  # habit_id → {completions, target,
                                        #   current_rate, trailing_rate,
                                        #   all_time_rate, total_completions}
}
```
