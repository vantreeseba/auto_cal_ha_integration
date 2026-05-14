"""Auto Cal Home Assistant integration."""
from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import AutoCalApiClient, AutoCalApiError
from .const import CONF_API_KEY, CONF_URL, DOMAIN, PLATFORMS
from .coordinator import AutoCalCoordinator


@dataclass
class AutoCalData:
    """Runtime data stored on the config entry."""

    coordinator: AutoCalCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Auto Cal from a config entry."""
    session = async_get_clientsession(hass)
    client = AutoCalApiClient(
        url=entry.data[CONF_URL],
        api_key=entry.data[CONF_API_KEY],
        session=session,
    )
    coordinator = AutoCalCoordinator(hass, client)

    try:
        await coordinator.async_config_entry_first_refresh()
    except AutoCalApiError as err:
        raise ConfigEntryNotReady(f"Failed to connect to Auto Cal: {err}") from err

    entry.runtime_data = AutoCalData(coordinator=coordinator)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    sub_task = hass.async_create_background_task(
        coordinator.async_subscribe_updates(),
        f"auto_cal_subscription_{entry.entry_id}",
    )

    def _cancel_subscription() -> None:
        sub_task.cancel()

    entry.async_on_unload(_cancel_subscription)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the integration when options change."""
    await hass.config_entries.async_reload(entry.entry_id)
