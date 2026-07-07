"""Auto Cal calendar platform."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import AutoCalData
from .const import DOMAIN
from .coordinator import AutoCalCoordinator

# How far ahead/behind to look when computing the "current or next" event
# for the entity state (async_get_events handles arbitrary UI ranges).
_STATE_LOOKBEHIND = timedelta(days=1)
_STATE_LOOKAHEAD = timedelta(days=30)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Auto Cal calendar entities."""
    data: AutoCalData = entry.runtime_data
    async_add_entities(
        [
            AutoCalCalendarEntity(data.coordinator, entry),
            AutoCalTimeBlocksEntity(data.coordinator, entry),
        ]
    )


class _AutoCalCalendarBase(CoordinatorEntity[AutoCalCoordinator], CalendarEntity):
    """Shared device wiring for Auto Cal calendar entities."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        unique_suffix: str,
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{unique_suffix}"

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": self._entry.title,
            "manufacturer": "Auto Cal",
        }


class AutoCalCalendarEntity(_AutoCalCalendarBase):
    """Represents the Auto Cal schedule as a HA calendar."""

    _attr_name = "Schedule"

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
    ) -> None:
        # Keep the historical unique_id suffix so existing entities survive.
        super().__init__(coordinator, entry, "calendar")

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next upcoming or currently active event."""
        now = datetime.now(tz=timezone.utc)
        upcoming = [e for e in self._ical_events() if e["end"] > now]
        if not upcoming:
            return None
        upcoming.sort(key=lambda e: e["start"])
        return _to_calendar_event(upcoming[0])

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Return all cached events that overlap the requested range."""
        return [
            _to_calendar_event(e)
            for e in self._ical_events()
            if e["start"] < end_date and e["end"] > start_date
        ]

    def _ical_events(self) -> list[dict[str, Any]]:
        if self.coordinator.data is None:
            return []
        return self.coordinator.data.get("ical_events", [])


class AutoCalTimeBlocksEntity(_AutoCalCalendarBase):
    """Represents Auto Cal's recurring time blocks as a HA calendar."""

    _attr_name = "Time Blocks"

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
    ) -> None:
        super().__init__(coordinator, entry, "time_blocks")

    @property
    def event(self) -> CalendarEvent | None:
        """Return the currently active or next block occurrence."""
        now = datetime.now(tz=timezone.utc)
        events = _expand_blocks(
            self._blocks(), now - _STATE_LOOKBEHIND, now + _STATE_LOOKAHEAD
        )
        upcoming = [e for e in events if e.end > now]
        if not upcoming:
            return None
        upcoming.sort(key=lambda e: e.start)
        return upcoming[0]

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Expand recurring blocks into occurrences overlapping the range."""
        return _expand_blocks(self._blocks(), start_date, end_date)

    def _blocks(self) -> list[dict[str, Any]]:
        if self.coordinator.data is None:
            return []
        return self.coordinator.data.get("block_events", [])


def _to_calendar_event(event: dict[str, Any]) -> CalendarEvent:
    return CalendarEvent(
        uid=event["uid"],
        summary=event["summary"],
        start=event["start"],
        end=event["end"],
        description=event.get("description"),
    )


def _expand_blocks(
    blocks: list[dict[str, Any]],
    range_start: datetime,
    range_end: datetime,
) -> list[CalendarEvent]:
    """Expand recurring time blocks into concrete occurrences in a range.

    An occurrence is included when it overlaps ``[range_start, range_end]``.
    Blocks without an RRULE are treated as single events.
    """
    # dateutil ships with Home Assistant core.
    from dateutil.rrule import rrulestr  # type: ignore[import]

    events: list[CalendarEvent] = []
    for block in blocks:
        start = block["start"]
        duration = block["end"] - start
        rrule_str = block.get("rrule")

        if not rrule_str:
            if start < range_end and block["end"] > range_start:
                events.append(_block_occurrence(block, start, duration))
            continue

        try:
            rule = rrulestr(rrule_str, dtstart=start)
        except (ValueError, TypeError):
            continue

        # Start scanning one duration early so an occurrence that began before
        # range_start but is still running is not missed.
        for occ_start in rule.between(range_start - duration, range_end, inc=True):
            occ_end = occ_start + duration
            if occ_start < range_end and occ_end > range_start:
                events.append(_block_occurrence(block, occ_start, duration))

    return events


def _block_occurrence(
    block: dict[str, Any],
    occ_start: datetime,
    duration: timedelta,
) -> CalendarEvent:
    return CalendarEvent(
        uid=f"{block['uid']}-{occ_start.date().isoformat()}",
        summary=block["summary"],
        start=occ_start,
        end=occ_start + duration,
        description=block.get("description"),
    )
