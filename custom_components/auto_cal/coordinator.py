"""Auto Cal DataUpdateCoordinator."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, time, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import AutoCalApiClient, AutoCalApiError
from .const import DEFAULT_SCAN_INTERVAL, DOMAIN, HABIT_DETAIL_PERIODS

_LOGGER = logging.getLogger(__name__)


def _summarize_habit_progress(detail: dict[str, Any]) -> dict[str, Any]:
    """Reduce a myHabitDetail payload to the fields entities consume.

    ``periods`` runs oldest → current, so the last entry is the current
    week/month. ``trailing_rate`` averages the per-period completion rates
    across the returned window.
    """
    periods = detail.get("periods") or []
    current = periods[-1] if periods else {}
    rates = [float(p.get("rate", 0.0)) for p in periods]
    return {
        "completions": int(current.get("completions", 0)),
        "target": int(current.get("target", 0)),
        "current_rate": float(current.get("rate", 0.0)),
        "trailing_rate": (sum(rates) / len(rates)) if rates else 0.0,
        "all_time_rate": float(detail.get("allTimeRate", 0.0)),
        "total_completions": int(detail.get("totalCompletions", 0)),
    }


def _parse_ical_events(ical_text: str) -> list[dict[str, Any]]:
    """Parse an iCal feed and return a list of event dicts."""
    # Lazy import so HA only imports icalendar after it has been installed.
    try:
        from icalendar import Calendar  # type: ignore[import]
    except ImportError:
        _LOGGER.error("icalendar library not installed")
        return []

    events: list[dict[str, Any]] = []
    try:
        cal = Calendar.from_ical(ical_text)
        for component in cal.walk():
            if component.name != "VEVENT":
                continue

            start = component["DTSTART"].dt
            end = component["DTEND"].dt

            # Normalise date → datetime (all-day events)
            if not isinstance(start, datetime):
                start = datetime.combine(start, time.min, tzinfo=timezone.utc)
            if not isinstance(end, datetime):
                end = datetime.combine(end, time.min, tzinfo=timezone.utc)

            # Ensure timezone-aware
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)

            description_raw = component.get("DESCRIPTION")
            description = str(description_raw) if description_raw else None

            events.append(
                {
                    "uid": str(component.get("UID", "")),
                    "summary": str(component.get("SUMMARY", "")),
                    "description": description,
                    "start": start,
                    "end": end,
                }
            )
    except Exception as err:  # noqa: BLE001
        _LOGGER.error("Failed to parse iCal data: %s", err)

    return events


class AutoCalCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Fetches todo lists, todos, and calendar events from Auto Cal."""

    def __init__(self, hass: HomeAssistant, client: AutoCalApiClient) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(minutes=DEFAULT_SCAN_INTERVAL),
        )
        self.client = client

    async def async_subscribe_updates(self) -> None:
        """Maintain a live GraphQL subscription and refresh on every event.

        Reconnects automatically after any network error. Exits cleanly when
        the background task is cancelled (integration unloaded).
        """
        _RETRY_DELAY = 30
        while True:
            try:
                async for _ in self.client.subscribe_todo_updates():
                    _LOGGER.debug("Subscription event — requesting refresh")
                    await self.async_request_refresh()
            except asyncio.CancelledError:
                return
            except Exception as err:
                _LOGGER.warning(
                    "Auto Cal subscription disconnected (%s) — reconnecting in %ds",
                    err,
                    _RETRY_DELAY,
                )
                try:
                    await asyncio.sleep(_RETRY_DELAY)
                except asyncio.CancelledError:
                    return

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            todo_lists, all_todos, ical_text = await _gather(
                self.client.get_todo_lists(),
                self.client.get_todos(),
                self.client.get_ical(),
            )
        except AutoCalApiError as err:
            raise UpdateFailed(f"Error fetching Auto Cal data: {err}") from err

        todos_by_list: dict[str, list[dict[str, Any]]] = {}
        for todo in all_todos:
            list_id = todo["list"]["id"]
            todos_by_list.setdefault(list_id, []).append(todo)

        ical_events = _parse_ical_events(ical_text)

        habits, habit_progress = await self._async_fetch_habits()

        return {
            "todo_lists": todo_lists,
            "todos_by_list": todos_by_list,
            "ical_events": ical_events,
            "habits": habits,
            "habit_progress": habit_progress,
        }

    async def _async_fetch_habits(
        self,
    ) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
        """Fetch habits and their current-period progress.

        Degrades gracefully to empty data (rather than failing the whole
        update) if the server does not support habits or the calls error,
        so todos and the calendar keep working against older servers.
        """
        try:
            habits = await self.client.get_habits()
        except AutoCalApiError as err:
            _LOGGER.warning("Auto Cal habits unavailable: %s", err)
            return [], {}

        progress: dict[str, dict[str, Any]] = {}
        if not habits:
            return habits, progress

        try:
            details = await _gather(
                *(
                    self.client.get_habit_detail(h["id"], HABIT_DETAIL_PERIODS)
                    for h in habits
                )
            )
        except AutoCalApiError as err:
            _LOGGER.warning("Auto Cal habit details unavailable: %s", err)
            return habits, progress

        for habit, detail in zip(habits, details):
            if detail is not None:
                progress[habit["id"]] = _summarize_habit_progress(detail)
        return habits, progress


async def _gather(*coros):  # type: ignore[no-untyped-def]
    """Thin wrapper so tests can patch gather behaviour."""
    return await asyncio.gather(*coros)
