"""Tests for AutoCalCoordinator."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from homeassistant.helpers.update_coordinator import UpdateFailed

from custom_components.auto_cal.api import AutoCalConnectionError
from custom_components.auto_cal.coordinator import AutoCalCoordinator, _parse_ical_events

from .conftest import MOCK_ICAL, MOCK_TODO_LISTS, MOCK_TODOS


# ------------------------------------------------------------------
# _parse_ical_events unit tests (no HA needed)
# ------------------------------------------------------------------


def test_parse_ical_events_basic():
    events = _parse_ical_events(MOCK_ICAL.decode())
    assert len(events) == 1
    e = events[0]
    assert e["uid"] == "todo-1-2026-05-13@auto-cal"
    assert e["summary"] == "Write tests"
    assert e["start"].year == 2026
    assert e["end"] > e["start"]


def test_parse_ical_events_empty():
    ical = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n"
    assert _parse_ical_events(ical) == []


def test_parse_ical_events_bad_data():
    # Should not raise; returns []
    result = _parse_ical_events("not valid ical data at all %%%")
    assert isinstance(result, list)


# ------------------------------------------------------------------
# Coordinator integration tests
# ------------------------------------------------------------------


async def test_coordinator_fetches_data(hass, mock_api_client):
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    assert coordinator.data is not None
    assert len(coordinator.data["todo_lists"]) == 2
    assert "list-1" in coordinator.data["todos_by_list"]
    assert len(coordinator.data["ical_events"]) == 1


async def test_coordinator_todos_grouped_by_list(hass, mock_api_client):
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    by_list = coordinator.data["todos_by_list"]
    assert len(by_list["list-1"]) == 2  # "Write tests" + "Old task"
    assert len(by_list["list-2"]) == 1  # "Buy groceries"


async def test_coordinator_raises_update_failed_on_connection_error(
    hass, mock_api_client
):
    mock_api_client.get_todo_lists.side_effect = AutoCalConnectionError("timeout")
    coordinator = AutoCalCoordinator(hass, mock_api_client)

    with pytest.raises(UpdateFailed):
        await coordinator.async_refresh()


async def test_coordinator_ical_parse_error_returns_empty_events(
    hass, mock_api_client
):
    mock_api_client.get_ical.return_value = "garbage data"
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    assert coordinator.data["ical_events"] == []
