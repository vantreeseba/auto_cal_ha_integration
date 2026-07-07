"""Auto Cal habit binary sensor platform."""
from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import AutoCalData
from .coordinator import AutoCalCoordinator
from .entity import AutoCalHabitEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Create a 'Goal met' binary sensor per habit."""
    data: AutoCalData = entry.runtime_data
    coordinator = data.coordinator

    if coordinator.data is None:
        return

    async_add_entities(
        AutoCalHabitGoalMetBinarySensor(coordinator, entry, habit)
        for habit in coordinator.data.get("habits", [])
    )


class AutoCalHabitGoalMetBinarySensor(AutoCalHabitEntity, BinarySensorEntity):
    """On when a habit has met its target for the current period."""

    _attr_name = "Goal met"
    _attr_icon = "mdi:trophy"

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        habit: dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry, habit)
        self._attr_unique_id = f"{entry.entry_id}_habit_{self._habit_id}_goal_met"

    @property
    def is_on(self) -> bool | None:
        progress = self._progress
        if not progress:
            return None
        target = progress.get("target", 0)
        return target > 0 and progress.get("completions", 0) >= target
