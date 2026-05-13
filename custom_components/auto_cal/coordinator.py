"""Auto Cal DataUpdateCoordinator."""
from __future__ import annotations

import logging
from datetime import datetime, time, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import AutoCalApiClient, AutoCalApiError
from .const import DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


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

        return {
            "todo_lists": todo_lists,
            "todos_by_list": todos_by_list,
            "ical_events": ical_events,
        }


async def _gather(*coros):  # type: ignore[no-untyped-def]
    """Thin wrapper so tests can patch gather behaviour."""
    import asyncio

    return await asyncio.gather(*coros)
