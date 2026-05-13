"""Config flow for Auto Cal integration."""
from __future__ import annotations

import logging
from typing import Any

import aiohttp
import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import AutoCalApiClient, AutoCalAuthError, AutoCalConnectionError
from .const import CONF_API_KEY, CONF_URL, DOMAIN

_LOGGER = logging.getLogger(__name__)

_STEP_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_URL): str,
        vol.Required(CONF_API_KEY): str,
    }
)


async def _validate_credentials(
    session: aiohttp.ClientSession,
    url: str,
    api_key: str,
) -> str | None:
    """
    Try to connect and authenticate.

    Returns an error key string on failure, or None on success.
    """
    client = AutoCalApiClient(url, api_key, session)
    try:
        await client.get_todo_lists()
    except AutoCalAuthError:
        return "invalid_auth"
    except AutoCalConnectionError:
        return "cannot_connect"
    except Exception:  # noqa: BLE001
        _LOGGER.exception("Unexpected error validating Auto Cal credentials")
        return "unknown"
    return None


class AutoCalConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the initial setup config flow."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        errors: dict[str, str] = {}

        if user_input is not None:
            url: str = user_input[CONF_URL].rstrip("/")
            api_key: str = user_input[CONF_API_KEY].strip()

            await self.async_set_unique_id(f"{url}_{api_key[:16]}")
            self._abort_if_unique_id_configured()

            session = async_get_clientsession(self.hass)
            error = await _validate_credentials(session, url, api_key)

            if error is None:
                return self.async_create_entry(
                    title=_entry_title(url),
                    data={CONF_URL: url, CONF_API_KEY: api_key},
                )
            errors["base"] = error

        return self.async_show_form(
            step_id="user",
            data_schema=_STEP_SCHEMA,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return AutoCalOptionsFlow(config_entry)


class AutoCalOptionsFlow(OptionsFlow):
    """Allow re-configuring the URL and API key after setup."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        self._config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        errors: dict[str, str] = {}

        if user_input is not None:
            url: str = user_input[CONF_URL].rstrip("/")
            api_key: str = user_input[CONF_API_KEY].strip()

            session = async_get_clientsession(self.hass)
            error = await _validate_credentials(session, url, api_key)

            if error is None:
                self.hass.config_entries.async_update_entry(
                    self._config_entry,
                    data={CONF_URL: url, CONF_API_KEY: api_key},
                )
                return self.async_abort(reason="reconfigure_successful")
            errors["base"] = error

        current = self._config_entry.data
        schema = vol.Schema(
            {
                vol.Required(CONF_URL, default=current.get(CONF_URL, "")): str,
                vol.Required(CONF_API_KEY, default=current.get(CONF_API_KEY, "")): str,
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
        )


def _entry_title(url: str) -> str:
    """Derive a human-readable title from the server URL."""
    # Strip scheme for brevity: "http://192.168.1.10:4000" → "192.168.1.10:4000"
    for scheme in ("https://", "http://"):
        if url.startswith(scheme):
            return url[len(scheme):]
    return url
