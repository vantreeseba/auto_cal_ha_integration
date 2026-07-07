"""Auto Cal habit sensor platform."""
from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import (
    SensorEntity,
    SensorStateClass,
)
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
    """Create progress + completion-rate sensors per habit."""
    data: AutoCalData = entry.runtime_data
    coordinator = data.coordinator

    if coordinator.data is None:
        return

    entities: list[SensorEntity] = []
    for habit in coordinator.data.get("habits", []):
        entities.append(AutoCalHabitProgressSensor(coordinator, entry, habit))
        entities.append(AutoCalHabitRateSensor(coordinator, entry, habit))
    async_add_entities(entities)


class AutoCalHabitProgressSensor(AutoCalHabitEntity, SensorEntity):
    """Number of completions logged this period for a habit."""

    _attr_name = "Progress"
    _attr_icon = "mdi:progress-check"
    _attr_native_unit_of_measurement = "completions"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        habit: dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry, habit)
        self._attr_unique_id = f"{entry.entry_id}_habit_{self._habit_id}_progress"

    @property
    def native_value(self) -> int | None:
        progress = self._progress
        if not progress:
            return None
        return progress.get("completions")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        habit = self._habit or {}
        progress = self._progress
        target = progress.get("target", 0)
        completions = progress.get("completions", 0)
        activity_type = habit.get("activityType")
        return {
            "target": target,
            "remaining": max(target - completions, 0),
            "frequency_unit": habit.get("frequencyUnit"),
            "frequency_count": habit.get("frequencyCount"),
            "current_period_rate": progress.get("current_rate"),
            "all_time_rate": progress.get("all_time_rate"),
            "total_completions": progress.get("total_completions"),
            "activity_type": activity_type["name"] if activity_type else None,
            "priority": habit.get("priority"),
            "estimated_length": habit.get("estimatedLength"),
        }


class AutoCalHabitRateSensor(AutoCalHabitEntity, SensorEntity):
    """Trailing completion rate (%) across recent periods for a habit."""

    _attr_name = "Completion rate"
    _attr_icon = "mdi:chart-line"
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        habit: dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry, habit)
        self._attr_unique_id = f"{entry.entry_id}_habit_{self._habit_id}_rate"

    @property
    def native_value(self) -> int | None:
        progress = self._progress
        if not progress:
            return None
        return round(progress.get("trailing_rate", 0.0) * 100)
