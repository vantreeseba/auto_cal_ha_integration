# API Reference

Auto Cal server exposes two endpoints used by this integration.

## Authentication

- **GraphQL**: `Authorization: Bearer <acal_token>` header
- **iCal**: `?secret=<acal_token>` query param

API keys are minted in Auto Cal's Settings page. Keys must have `read` scope (default). Write mutations require `write` scope.

## iCal Endpoint

```
GET /ical?secret=<api_key>[&view=blocks]
```

Default (no `view`): returns `text/calendar` for the computed **schedule** over the current + next ISO week. Scheduled **todos and habit instances** both appear as VEVENTs (as of auto-cal v1.16.0 the feed includes habits). Each event has:
- `UID`: `{item.id}-{weekStart}@auto-cal`
- `DTSTART` / `DTEND`: UTC datetime strings
- `SUMMARY`: item title
- `DESCRIPTION`: multi-line (`Type: Todo|Habit`, Activity, Priority, Estimated)

`view=blocks`: returns recurring **time blocks** as `RRULE:FREQ=WEEKLY` events (`UID`: `block-{id}@auto-cal`). This integration does **not** request this view — it only consumes the default schedule feed.

**Limitation**: the default schedule feed only covers 2 weeks; requests outside that window return no events.

## GraphQL Endpoint

```
POST /graphql
Content-Type: application/json
Authorization: Bearer <api_key>
{"query": "...", "variables": {...}}
```

### Queries Used

```graphql
query MyTodoLists {
  myTodoLists {
    id name description defaultPriority defaultEstimatedLength
    activityType { id name color }
  }
}

query MyTodos($listId: ID) {
  myTodos(listId: $listId) {
    id title description priority estimatedLength
    dueAt scheduledAt completedAt manuallyScheduled
    list { id name }
  }
}
# myTodos also accepts optional `completed: Boolean` and `orderBy` args (unused here).

query MyHabits {
  myHabits {
    id title description priority estimatedLength
    frequencyCount frequencyUnit
    activityType { id name color }
  }
}

# Current-period progress per habit. `periods` runs oldest → current;
# each period carries { completions, target, rate }. Weekly vs monthly
# period boundaries are resolved server-side from the habit's frequencyUnit.
query MyHabitDetail($id: ID!, $periods: Int) {
  myHabitDetail(habitId: $id, periods: $periods) {
    habitId title totalCompletions allTimeRate
    periods { label completions target rate }
  }
}
```

### Mutations Used

```graphql
mutation CreateTodo($input: CreateTodoArgs!) {
  myCreateTodo(input: $input) { id title priority dueAt scheduledAt }
}
# CreateTodoArgs: listId (required), title (required),
#   description, priority, estimatedLength, dueAt, scheduledAt

mutation UpdateTodo($input: UpdateTodoArgs!) {
  myUpdateTodo(input: $input) {
    id title priority dueAt scheduledAt completedAt manuallyScheduled
  }
}
# UpdateTodoArgs: id (required), title, description, priority,
#   estimatedLength, dueAt, scheduledAt, manuallyScheduled, completedAt

mutation CompleteTodo($id: ID!) {
  myCompleteTodo(id: $id) { id completedAt }
}
# myCompleteTodo also accepts optional `completedAt: String` (unused here).

mutation DeleteTodo($id: ID!) {
  myDeleteTodo(id: $id)   # returns Boolean
}
# Also available server-side: myDeleteTodos(listId: ID!, completed: Boolean)
#   for bulk clear-completed (not used — the integration deletes per-id).

# Records a habit completion at the current time (no scheduledAt/completedAt sent).
mutation CompleteHabit($input: CompleteHabitArgs!) {
  myCompleteHabit(input: $input) { id completedAt }
}
# CompleteHabitArgs: habitId (required), scheduledAt, completedAt
# Undo is myUncompleteHabit(completionId: ID!) — not used (log-only in HA).
```

### Subscriptions

```
WebSocket ws://<host>/graphql  (wss:// for HTTPS)
Sec-WebSocket-Protocol: graphql-transport-ws
```

Uses the `graphql-ws` v6 protocol. Auth is passed in `connection_init` payload:

```json
{ "type": "connection_init", "payload": { "authorization": "Bearer <api_key>" } }
```

Subscriptions used:

```graphql
subscription { myTodosUpdated { type } }
subscription { myTodoListsUpdated { type } }
```

Both fire on create / update / delete. The integration subscribes to both with separate IDs (`"todos"` and `"lists"`) and triggers a full coordinator refresh on every `next` message. The server may send `ping` messages; the client responds with `pong`.

**No habit subscription exists.** Habit changes (including completions made outside HA) surface only on the 15-min poll. A button press in HA calls `async_refresh()` so the change is reflected immediately.

## Error Handling

| HTTP Status | Exception |
|-------------|-----------|
| Connection refused / timeout | `AutoCalConnectionError` |
| 401 / 403 | `AutoCalAuthError` |
| GraphQL `errors` array present | `AutoCalApiError` |
