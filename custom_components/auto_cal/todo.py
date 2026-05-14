"""Auto Cal todo list platform."""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import AutoCalData
from .const import DOMAIN
from .coordinator import AutoCalCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Create one AutoCalTodoListEntity per list returned by the coordinator."""
    data: AutoCalData = entry.runtime_data
    coordinator = data.coordinator

    if coordinator.data is None:
        return

    entities = [
        AutoCalTodoListEntity(coordinator, entry, todo_list)
        for todo_list in coordinator.data.get("todo_lists", [])
    ]
    async_add_entities(entities)


class AutoCalTodoListEntity(CoordinatorEntity[AutoCalCoordinator], TodoListEntity):
    """Represents a single Auto Cal todo list."""

    _attr_has_entity_name = True
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        todo_list: dict[str, Any],
    ) -> None:
        super().__init__(coordinator)
        self._list_id: str = todo_list["id"]
        self._attr_name: str = todo_list["name"]
        self._attr_unique_id = f"{entry.entry_id}_todo_{self._list_id}"
        self._entry = entry

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": self._entry.title,
            "manufacturer": "Auto Cal",
        }

    @property
    def todo_items(self) -> list[TodoItem] | None:
        if self.coordinator.data is None:
            return None
        raw = self.coordinator.data.get("todos_by_list", {}).get(self._list_id, [])
        return [_to_todo_item(t) for t in raw]

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def async_create_todo_item(self, item: TodoItem) -> None:
        due_at: str | None = None
        if item.due is not None:
            due_at = _to_iso(item.due)

        await self.coordinator.client.create_todo(
            list_id=self._list_id,
            title=item.summary or "",
            description=item.description,
            due_at=due_at,
        )
        await self.coordinator.async_refresh()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        update_fields: dict[str, Any] = {}

        if item.summary is not None:
            update_fields["title"] = item.summary
        if item.description is not None:
            update_fields["description"] = item.description
        if item.due is not None:
            update_fields["dueAt"] = _to_iso(item.due)

        if item.status == TodoItemStatus.COMPLETED:
            await self.coordinator.client.complete_todo(item.uid)  # type: ignore[arg-type]
            # Still push any other field changes
            if update_fields:
                await self.coordinator.client.update_todo(item.uid, **update_fields)  # type: ignore[arg-type]

        elif item.status == TodoItemStatus.NEEDS_ACTION:
            # Uncomplete by clearing completedAt
            update_fields["completedAt"] = None
            await self.coordinator.client.update_todo(item.uid, **update_fields)  # type: ignore[arg-type]

        elif update_fields:
            await self.coordinator.client.update_todo(item.uid, **update_fields)  # type: ignore[arg-type]

        await self.coordinator.async_refresh()


# ------------------------------------------------------------------
# Conversion helpers
# ------------------------------------------------------------------


def _to_todo_item(raw: dict[str, Any]) -> TodoItem:
    due: datetime | None = None
    if raw.get("dueAt"):
        try:
            due = datetime.fromisoformat(raw["dueAt"])
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            due = None

    status = (
        TodoItemStatus.COMPLETED
        if raw.get("completedAt") is not None
        else TodoItemStatus.NEEDS_ACTION
    )

    return TodoItem(
        uid=raw["id"],
        summary=raw["title"],
        status=status,
        description=raw.get("description"),
        due=due,
    )


def _to_iso(due: date | datetime) -> str:
    if isinstance(due, datetime):
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return due.isoformat()
    # date only → midnight UTC
    return datetime(due.year, due.month, due.day, tzinfo=timezone.utc).isoformat()
