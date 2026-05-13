"""Auto Cal calendar platform."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import AutoCalData
from .const import DOMAIN
from .coordinator import AutoCalCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Auto Cal calendar entity."""
    data: AutoCalData = entry.runtime_data
    async_add_entities([AutoCalCalendarEntity(data.coordinator, entry)])


class AutoCalCalendarEntity(CoordinatorEntity[AutoCalCoordinator], CalendarEntity):
    """Represents the Auto Cal schedule as a HA calendar."""

    _attr_has_entity_name = True
    _attr_name = "Schedule"

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
    ) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_calendar"
        self._entry = entry

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": self._entry.title,
            "manufacturer": "Auto Cal",
        }

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next upcoming or currently active event."""
        now = datetime.now(tz=self._get_tz())
        upcoming = [
            e
            for e in self._ical_events()
            if e["end"] > now
        ]
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

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _ical_events(self) -> list[dict[str, Any]]:
        if self.coordinator.data is None:
            return []
        return self.coordinator.data.get("ical_events", [])

    def _get_tz(self):  # type: ignore[no-untyped-def]
        from datetime import timezone

        return timezone.utc


def _to_calendar_event(event: dict[str, Any]) -> CalendarEvent:
    return CalendarEvent(
        uid=event["uid"],
        summary=event["summary"],
        start=event["start"],
        end=event["end"],
        description=event.get("description"),
    )
