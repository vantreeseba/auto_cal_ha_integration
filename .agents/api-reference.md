# API Reference

Auto Cal server exposes two endpoints used by this integration.

## Authentication

- **GraphQL**: `Authorization: Bearer <acal_token>` header
- **iCal**: `?secret=<acal_token>` query param

API keys are minted in Auto Cal's Settings page. Keys must have `read` scope (default). Write mutations require `write` scope.

## iCal Endpoint

```
GET /ical?secret=<api_key>
```

Returns `text/calendar` with VEVENT entries for the current and next ISO week. Each event has:
- `UID`: `{item.id}-{weekStart}@auto-cal`
- `DTSTART` / `DTEND`: UTC datetime strings
- `SUMMARY`: item title
- `DESCRIPTION`: multi-line (Type, Activity, Priority, Estimated length)

**Limitation**: only 2 weeks of data; requests outside that window return no events.

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

## Error Handling

| HTTP Status | Exception |
|-------------|-----------|
| Connection refused / timeout | `AutoCalConnectionError` |
| 401 / 403 | `AutoCalAuthError` |
| GraphQL `errors` array present | `AutoCalApiError` |
