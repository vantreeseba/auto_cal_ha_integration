"""Tests for AutoCalTodoListEntity."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from homeassistant.components.todo import TodoItemStatus

from custom_components.auto_cal.todo import _to_iso, _to_todo_item

from .conftest import MOCK_TODO_LISTS, MOCK_TODOS


# ------------------------------------------------------------------
# Unit tests for conversion helpers
# ------------------------------------------------------------------


def test_to_todo_item_needs_action():
    item = _to_todo_item(MOCK_TODOS[0])
    assert item.uid == "todo-1"
    assert item.summary == "Write tests"
    assert item.status == TodoItemStatus.NEEDS_ACTION


def test_to_todo_item_complete():
    item = _to_todo_item(MOCK_TODOS[2])
    assert item.uid == "todo-3"
    assert item.status == TodoItemStatus.COMPLETED


def test_to_todo_item_with_due():
    item = _to_todo_item(MOCK_TODOS[1])
    assert item.due is not None
    assert item.due.year == 2026


def test_to_iso_date():
    from datetime import date

    result = _to_iso(date(2026, 5, 15))
    assert result.startswith("2026-05-15")
    assert "Z" in result or "+00:00" in result


def test_to_iso_datetime_naive():
    from datetime import datetime

    result = _to_iso(datetime(2026, 5, 15, 10, 0))
    assert "2026-05-15" in result


# ------------------------------------------------------------------
# Integration tests — entity setup
# ------------------------------------------------------------------


async def test_todo_entities_created(hass, mock_api_client, mock_config_entry):
    """One entity per todo list should be created."""
    with patch(
        "custom_components.auto_cal.coordinator.AutoCalCoordinator._async_update_data",
        return_value={
            "todo_lists": MOCK_TODO_LISTS,
            "todos_by_list": {
                "list-1": [MOCK_TODOS[0], MOCK_TODOS[2]],
                "list-2": [MOCK_TODOS[1]],
            },
            "ical_events": [],
        },
    ), patch(
        "custom_components.auto_cal.AutoCalApiClient",
        return_value=mock_api_client,
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()

    states = hass.states.async_all("todo")
    names = {s.attributes.get("friendly_name", s.name) for s in states}
    assert len(states) == 2
    assert any("Work" in n for n in names)
    assert any("Personal" in n for n in names)


async def test_todo_create_item(hass, mock_api_client, mock_config_entry):
    """async_create_todo_item calls client.create_todo and refreshes."""
    mock_data = {
        "todo_lists": MOCK_TODO_LISTS,
        "todos_by_list": {"list-1": [MOCK_TODOS[0]], "list-2": []},
        "ical_events": [],
    }
    with patch(
        "custom_components.auto_cal.coordinator.AutoCalCoordinator._async_update_data",
        return_value=mock_data,
    ), patch(
        "custom_components.auto_cal.AutoCalApiClient",
        return_value=mock_api_client,
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()

        states = hass.states.async_all("todo")
        work_entity = next(
            (s for s in states if "Work" in (s.attributes.get("friendly_name") or s.name)),
            None,
        )
        assert work_entity is not None

        await hass.services.async_call(
            "todo",
            "add_item",
            {"item": "New task"},
            target={"entity_id": work_entity.entity_id},
            blocking=True,
        )

    mock_api_client.create_todo.assert_called_once()


async def test_todo_complete_item(hass, mock_api_client, mock_config_entry):
    """Marking an item COMPLETED should call client.complete_todo."""
    mock_data = {
        "todo_lists": MOCK_TODO_LISTS,
        "todos_by_list": {"list-1": [MOCK_TODOS[0]], "list-2": []},
        "ical_events": [],
    }
    with patch(
        "custom_components.auto_cal.coordinator.AutoCalCoordinator._async_update_data",
        return_value=mock_data,
    ), patch(
        "custom_components.auto_cal.AutoCalApiClient",
        return_value=mock_api_client,
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()

        states = hass.states.async_all("todo")
        work_entity = next(
            (s for s in states if "Work" in (s.attributes.get("friendly_name") or s.name)),
            None,
        )
        assert work_entity is not None

        await hass.services.async_call(
            "todo",
            "update_item",
            {"item": "Write tests", "status": "completed"},
            target={"entity_id": work_entity.entity_id},
            blocking=True,
        )

    mock_api_client.complete_todo.assert_called_once_with("todo-1")


async def test_todo_delete_item(hass, mock_api_client, mock_config_entry):
    """Removing an item should call client.delete_todo."""
    mock_data = {
        "todo_lists": MOCK_TODO_LISTS,
        "todos_by_list": {"list-1": [MOCK_TODOS[0]], "list-2": []},
        "ical_events": [],
        "habits": [],
        "habit_progress": {},
    }
    with patch(
        "custom_components.auto_cal.coordinator.AutoCalCoordinator._async_update_data",
        return_value=mock_data,
    ), patch(
        "custom_components.auto_cal.AutoCalApiClient",
        return_value=mock_api_client,
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()

        states = hass.states.async_all("todo")
        work_entity = next(
            (s for s in states if "Work" in (s.attributes.get("friendly_name") or s.name)),
            None,
        )
        assert work_entity is not None

        await hass.services.async_call(
            "todo",
            "remove_item",
            {"item": "Write tests"},
            target={"entity_id": work_entity.entity_id},
            blocking=True,
        )

    mock_api_client.delete_todo.assert_called_once_with("todo-1")
