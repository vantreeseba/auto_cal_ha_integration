"""Tests for the bundled Lovelace card registration."""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.auto_cal.const import CARDS_FILENAME, CARDS_URL_PATH
from custom_components.auto_cal.frontend import async_register_cards

COMPONENT_DIR = Path("custom_components/auto_cal")


@pytest.fixture
def mock_http(hass):
    """Stand in for the http component, which tests do not set up."""
    http = MagicMock()
    http.async_register_static_paths = AsyncMock()
    hass.http = http
    return http


def test_card_bundle_is_committed():
    """HACS/manual installs ship the built bundle — no npm needed."""
    bundle = COMPONENT_DIR / "www" / CARDS_FILENAME
    assert bundle.is_file(), f"{bundle} missing — run `npm run build`"
    assert bundle.stat().st_size > 0


def test_card_bundle_registers_both_cards():
    """The built bundle defines the elements the docs tell users to configure."""
    source = (COMPONENT_DIR / "www" / CARDS_FILENAME).read_text()
    assert "auto-cal-activity-card" in source
    assert "auto-cal-activity-timeline-card" in source


def test_manifest_declares_frontend_dependencies():
    """Serving the bundle needs http; auto-loading it needs frontend.

    They are `after_dependencies` rather than hard ones so the integration
    still loads on installs without the frontend (and in tests).
    """
    manifest = json.loads((COMPONENT_DIR / "manifest.json").read_text())
    assert set(manifest["after_dependencies"]) >= {"frontend", "http"}


async def test_register_cards_serves_and_loads_bundle(hass, mock_http):
    """The bundle is registered as a static path and added to the frontend."""
    with patch("custom_components.auto_cal.frontend.add_extra_js_url") as mock_add_js:
        await async_register_cards(hass)

    configs = mock_http.async_register_static_paths.call_args[0][0]
    assert [c.url_path for c in configs] == [CARDS_URL_PATH]
    assert configs[0].path.endswith(f"www/{CARDS_FILENAME}")

    url = mock_add_js.call_args[0][1]
    assert url.startswith(f"{CARDS_URL_PATH}?v=")


async def test_register_cards_is_idempotent(hass, mock_http):
    """A second config entry must not re-register the same static path."""
    with patch("custom_components.auto_cal.frontend.add_extra_js_url"):
        await async_register_cards(hass)
        await async_register_cards(hass)

    assert mock_http.async_register_static_paths.call_count == 1


async def test_register_cards_skips_missing_bundle(hass, mock_http, caplog):
    """A missing bundle warns but never blocks integration setup."""
    with (
        patch.object(Path, "is_file", return_value=False),
        patch("custom_components.auto_cal.frontend.add_extra_js_url") as mock_add_js,
    ):
        await async_register_cards(hass)

    assert not mock_http.async_register_static_paths.called
    assert not mock_add_js.called
    assert "card bundle missing" in caplog.text


async def test_register_cards_skips_without_http(hass):
    """Setup must not blow up on an install with no HTTP component."""
    hass.http = None
    with patch("custom_components.auto_cal.frontend.add_extra_js_url") as mock_add_js:
        await async_register_cards(hass)

    assert not mock_add_js.called


async def test_register_cards_survives_missing_frontend(hass, mock_http, caplog):
    """A headless install still gets the file served, just not auto-loaded."""
    with patch(
        "custom_components.auto_cal.frontend.add_extra_js_url", side_effect=KeyError
    ):
        await async_register_cards(hass)

    assert mock_http.async_register_static_paths.called
    assert "Frontend unavailable" in caplog.text
