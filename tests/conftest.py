"""Shared test fixtures."""
from __future__ import annotations

import asyncio as _asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"

MOCK_URL = "http://auto-cal.local:4000"
MOCK_API_KEY = "acal_testkey1234567890abcdefghijklmn"

MOCK_TODO_LISTS = [
    {
        "id": "list-1",
        "name": "Work",
        "description": None,
        "defaultPriority": 50,
        "defaultEstimatedLength": 30,
        "activityType": {"id": "at-1", "name": "Work", "color": "#6366f1"},
    },
    {
        "id": "list-2",
        "name": "Personal",
        "description": "Personal tasks",
        "defaultPriority": 30,
        "defaultEstimatedLength": 20,
        "activityType": {"id": "at-2", "name": "Personal", "color": "#22c55e"},
    },
]

MOCK_TODOS = [
    {
        "id": "todo-1",
        "title": "Write tests",
        "description": "Add coverage",
        "priority": 80,
        "estimatedLength": 60,
        "dueAt": None,
        "scheduledAt": "2026-05-14T09:00:00",
        "completedAt": None,
        "manuallyScheduled": False,
        "list": {"id": "list-1", "name": "Work"},
    },
    {
        "id": "todo-2",
        "title": "Buy groceries",
        "description": None,
        "priority": 40,
        "estimatedLength": 30,
        "dueAt": "2026-05-15T00:00:00Z",
        "scheduledAt": None,
        "completedAt": None,
        "manuallyScheduled": False,
        "list": {"id": "list-2", "name": "Personal"},
    },
    {
        "id": "todo-3",
        "title": "Old task",
        "description": None,
        "priority": 20,
        "estimatedLength": 15,
        "dueAt": None,
        "scheduledAt": "2026-05-10T10:00:00",
        "completedAt": "2026-05-10T10:30:00",
        "manuallyScheduled": False,
        "list": {"id": "list-1", "name": "Work"},
    },
]

MOCK_ICAL = b"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Auto Cal//EN
BEGIN:VEVENT
UID:todo-1-2026-05-13@auto-cal
DTSTART:20260514T090000Z
DTEND:20260514T100000Z
SUMMARY:Write tests
DESCRIPTION:Type: Todo\nActivity: Work\nPriority: 80\nEstimated: 60 min
END:VEVENT
END:VCALENDAR
"""


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Allow loading custom integrations in tests."""
    yield


@pytest.fixture
def mock_api_client():
    """Return a mock AutoCalApiClient."""
    client = MagicMock()
    client.get_todo_lists = AsyncMock(return_value=MOCK_TODO_LISTS)
    client.get_todos = AsyncMock(return_value=MOCK_TODOS)
    client.get_ical = AsyncMock(return_value=MOCK_ICAL.decode())
    client.create_todo = AsyncMock(
        return_value={"id": "todo-new", "title": "New", "priority": 0, "dueAt": None, "scheduledAt": None}
    )
    client.update_todo = AsyncMock(return_value=MOCK_TODOS[0])
    client.complete_todo = AsyncMock(
        return_value={"id": "todo-1", "completedAt": "2026-05-14T10:00:00Z"}
    )

    async def _subscribe_never():
        # Blocks without yielding — simulates an idle connected subscription.
        # Cancelled cleanly when the background task is torn down.
        await _asyncio.Event().wait()
        yield  # unreachable; makes this an async generator

    client.subscribe_todo_updates = _subscribe_never
    return client


@pytest.fixture
def mock_config_entry(hass):
    """Return a mock config entry."""
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.auto_cal.const import CONF_API_KEY, CONF_URL, DOMAIN

    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_URL: MOCK_URL, CONF_API_KEY: MOCK_API_KEY},
        title="auto-cal.local:4000",
    )
    entry.add_to_hass(hass)
    return entry
