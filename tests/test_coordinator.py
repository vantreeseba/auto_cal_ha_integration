"""Tests for AutoCalCoordinator."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers.update_coordinator import UpdateFailed

from custom_components.auto_cal.api import AutoCalApiError, AutoCalConnectionError
from custom_components.auto_cal.coordinator import (
    AutoCalCoordinator,
    _parse_ical_events,
    _summarize_habit_progress,
)

from .conftest import MOCK_HABIT_DETAILS, MOCK_ICAL, MOCK_TODO_LISTS, MOCK_TODOS


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
# _summarize_habit_progress unit tests (no HA needed)
# ------------------------------------------------------------------


def test_summarize_habit_progress_uses_current_period():
    summary = _summarize_habit_progress(MOCK_HABIT_DETAILS["habit-1"])
    # Current period is the LAST entry in periods.
    assert summary["completions"] == 2
    assert summary["target"] == 3
    assert summary["total_completions"] == 10
    # Trailing rate averages the four period rates.
    assert 0.8 < summary["trailing_rate"] < 0.85


def test_summarize_habit_progress_empty_periods():
    summary = _summarize_habit_progress(
        {"habitId": "x", "totalCompletions": 0, "allTimeRate": 0.0, "periods": []}
    )
    assert summary["completions"] == 0
    assert summary["target"] == 0
    assert summary["trailing_rate"] == 0.0


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


async def test_coordinator_fetches_habits(hass, mock_api_client):
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    assert len(coordinator.data["habits"]) == 2
    progress = coordinator.data["habit_progress"]
    assert progress["habit-1"]["completions"] == 2
    assert progress["habit-1"]["target"] == 3
    assert progress["habit-2"]["completions"] == 5


async def test_coordinator_habits_degrade_gracefully(hass, mock_api_client):
    """A habits API error should not fail the whole update."""
    mock_api_client.get_habits.side_effect = AutoCalApiError("no habits support")
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    assert coordinator.last_update_success is True
    assert coordinator.data["habits"] == []
    assert coordinator.data["habit_progress"] == {}
    # Todos and calendar still populated.
    assert len(coordinator.data["todo_lists"]) == 2


async def test_coordinator_todos_grouped_by_list(hass, mock_api_client):
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    by_list = coordinator.data["todos_by_list"]
    assert len(by_list["list-1"]) == 2  # "Write tests" + "Old task"
    assert len(by_list["list-2"]) == 1  # "Buy groceries"


async def test_coordinator_raises_update_failed_on_connection_error(
    hass, mock_api_client
):
    # async_refresh() swallows UpdateFailed internally and sets last_update_success=False.
    # Use async_config_entry_first_refresh() if you want it re-raised.
    mock_api_client.get_todo_lists.side_effect = AutoCalConnectionError("timeout")
    coordinator = AutoCalCoordinator(hass, mock_api_client)

    await coordinator.async_refresh()
    assert coordinator.last_update_success is False


async def test_coordinator_ical_parse_error_returns_empty_events(
    hass, mock_api_client
):
    mock_api_client.get_ical.return_value = "garbage data"
    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    assert coordinator.data["ical_events"] == []


# ------------------------------------------------------------------
# Subscription tests
# ------------------------------------------------------------------


async def test_subscription_event_triggers_refresh(hass, mock_api_client):
    """Each subscription event should call async_request_refresh."""

    refresh_called = asyncio.Event()

    async def _one_then_idle():
        yield {"type": "next", "id": "todos", "payload": {}}
        await asyncio.Event().wait()  # hold connection open

    mock_api_client.subscribe_todo_updates = _one_then_idle

    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()
    coordinator.async_request_refresh = AsyncMock(
        side_effect=lambda: refresh_called.set()
    )

    task = asyncio.ensure_future(coordinator.async_subscribe_updates())
    await asyncio.wait_for(refresh_called.wait(), timeout=1.0)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)


async def test_subscription_retries_after_disconnect(hass, mock_api_client):
    """A connection error should trigger a retry; second attempt should succeed."""
    call_count = 0
    refresh_called = asyncio.Event()

    async def _fail_first_then_idle():
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise AutoCalConnectionError("test disconnect")
        yield {"type": "next", "id": "todos", "payload": {}}
        await asyncio.Event().wait()

    mock_api_client.subscribe_todo_updates = _fail_first_then_idle

    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()
    coordinator.async_request_refresh = AsyncMock(
        side_effect=lambda: refresh_called.set()
    )

    with patch("asyncio.sleep", AsyncMock(return_value=None)):
        task = asyncio.ensure_future(coordinator.async_subscribe_updates())
        await asyncio.wait_for(refresh_called.wait(), timeout=1.0)
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    assert call_count == 2


async def test_subscription_cancelled_exits_cleanly(hass, mock_api_client):
    """Cancelling the background task should exit without error."""

    async def _idle():
        await asyncio.Event().wait()
        yield

    mock_api_client.subscribe_todo_updates = _idle

    coordinator = AutoCalCoordinator(hass, mock_api_client)
    await coordinator.async_refresh()

    task = asyncio.ensure_future(coordinator.async_subscribe_updates())
    await asyncio.sleep(0)  # let it start
    task.cancel()
    results = await asyncio.gather(task, return_exceptions=True)
    # Task should finish without raising (CancelledError is caught internally)
    assert results == [None]
