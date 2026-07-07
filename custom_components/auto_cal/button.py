"""Auto Cal habit button platform."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import AutoCalData
from .coordinator import AutoCalCoordinator
from .entity import AutoCalHabitEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Create a 'Log completion' button per habit."""
    data: AutoCalData = entry.runtime_data
    coordinator = data.coordinator

    if coordinator.data is None:
        return

    async_add_entities(
        AutoCalHabitCompleteButton(coordinator, entry, habit)
        for habit in coordinator.data.get("habits", [])
    )


class AutoCalHabitCompleteButton(AutoCalHabitEntity, ButtonEntity):
    """Records a completion for a habit when pressed."""

    _attr_name = "Log completion"
    _attr_icon = "mdi:check-circle"

    def __init__(
        self,
        coordinator: AutoCalCoordinator,
        entry: ConfigEntry,
        habit: dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry, habit)
        self._attr_unique_id = f"{entry.entry_id}_habit_{self._habit_id}_complete"

    async def async_press(self) -> None:
        await self.coordinator.client.complete_habit(self._habit_id)
        await self.coordinator.async_refresh()
