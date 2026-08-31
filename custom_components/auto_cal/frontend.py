"""Serve the bundled Auto Cal Lovelace cards.

The cards are built from ``packages/frontend`` into ``www/auto-cal-cards.js``
(committed, so HACS/manual installs need no toolchain). Registering them here
means users get the cards with the integration — no separate resource setup.
"""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import CARDS_FILENAME, CARDS_URL_PATH, DOMAIN

_LOGGER = logging.getLogger(__name__)

# hass.data key marking the one-time (per HA instance) registration.
_REGISTERED = f"{DOMAIN}_cards_registered"


async def async_register_cards(hass: HomeAssistant) -> None:
    """Serve the card bundle and have the frontend load it.

    Safe to call from every config entry — only the first call registers.
    A missing bundle is logged and skipped so the integration still sets up.
    """
    if hass.data.get(_REGISTERED):
        return

    if getattr(hass, "http", None) is None:
        _LOGGER.debug("HTTP not available — skipping Auto Cal card registration")
        return

    path = Path(__file__).parent / "www" / CARDS_FILENAME
    if not await hass.async_add_executor_job(path.is_file):
        _LOGGER.warning(
            "Auto Cal card bundle missing at %s — run `npm run build` to build it",
            path,
        )
        return

    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARDS_URL_PATH, str(path), cache_headers=False)]
    )

    integration = await async_get_integration(hass, DOMAIN)
    try:
        # Cache-bust on upgrade so browsers do not keep an old bundle.
        add_extra_js_url(hass, f"{CARDS_URL_PATH}?v={integration.version}")
    except KeyError:
        # Frontend not set up (headless install) — the file is still served.
        _LOGGER.warning(
            "Frontend unavailable — add %s as a Lovelace resource manually",
            CARDS_URL_PATH,
        )

    hass.data[_REGISTERED] = True
    _LOGGER.debug("Registered Auto Cal cards at %s", CARDS_URL_PATH)
