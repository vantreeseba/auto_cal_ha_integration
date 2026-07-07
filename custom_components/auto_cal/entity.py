"""Shared base entity for Auto Cal habits."""
from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import AutoCalCoordinator


class AutoCalHabitEntity(CoordinatorEntity[AutoCalCoordinator]):
    """Base class for entities that represent a single Auto Cal habit.

    Each habit becomes its own HA device (grouped under the config entry's
    device), and reads its live data from the coordinator by habit id.
    """

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        habit: dict[str, Any],
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._habit_id: str = habit["id"]
        self._habit_title: str = habit["title"]

    @property
    def _habit(self) -> dict[str, Any] | None:
        """Return the current habit dict from the coordinator, or None."""
        if self.coordinator.data is None:
            return None
        for habit in self.coordinator.data.get("habits", []):
            if habit["id"] == self._habit_id:
                return habit
        return None

    @property
    def _progress(self) -> dict[str, Any]:
        """Return the current-period progress dict for this habit."""
        if self.coordinator.data is None:
            return {}
        return self.coordinator.data.get("habit_progress", {}).get(
            self._habit_id, {}
        )

    @property
    def available(self) -> bool:
        return super().available and self._habit is not None

    @property
    def device_info(self) -> DeviceInfo:
        habit = self._habit
        title = habit["title"] if habit else self._habit_title
        return DeviceInfo(
            identifiers={(DOMAIN, f"{self._entry.entry_id}_habit_{self._habit_id}")},
            name=title,
            manufacturer="Auto Cal",
            model="Habit",
            via_device=(DOMAIN, self._entry.entry_id),
        )
