"""Tests for the Auto Cal config flow."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.data_entry_flow import FlowResultType

from custom_components.auto_cal.api import AutoCalAuthError, AutoCalConnectionError
from custom_components.auto_cal.const import CONF_API_KEY, CONF_URL, DOMAIN

from .conftest import MOCK_API_KEY, MOCK_URL


async def test_user_form_shown(hass) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    assert result["type"] == FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {}


async def test_successful_setup(hass) -> None:
    with patch(
        "custom_components.auto_cal.config_flow._validate_credentials",
        return_value=None,
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            user_input={CONF_URL: MOCK_URL, CONF_API_KEY: MOCK_API_KEY},
        )

    assert result["type"] == FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_URL] == MOCK_URL
    assert result["data"][CONF_API_KEY] == MOCK_API_KEY


async def test_cannot_connect_error(hass) -> None:
    with patch(
        "custom_components.auto_cal.config_flow._validate_credentials",
        return_value="cannot_connect",
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            user_input={CONF_URL: MOCK_URL, CONF_API_KEY: MOCK_API_KEY},
        )

    assert result["type"] == FlowResultType.FORM
    assert result["errors"] == {"base": "cannot_connect"}


async def test_invalid_auth_error(hass) -> None:
    with patch(
        "custom_components.auto_cal.config_flow._validate_credentials",
        return_value="invalid_auth",
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            user_input={CONF_URL: MOCK_URL, CONF_API_KEY: MOCK_API_KEY},
        )

    assert result["type"] == FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_auth"}


async def test_duplicate_entry_aborted(hass) -> None:
    """Second setup with the same URL+key prefix should abort."""
    with patch(
        "custom_components.auto_cal.config_flow._validate_credentials",
        return_value=None,
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        await hass.config_entries.flow.async_configure(
            result["flow_id"],
            user_input={CONF_URL: MOCK_URL, CONF_API_KEY: MOCK_API_KEY},
        )

        result2 = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        result2 = await hass.config_entries.flow.async_configure(
            result2["flow_id"],
            user_input={CONF_URL: MOCK_URL, CONF_API_KEY: MOCK_API_KEY},
        )

    assert result2["type"] == FlowResultType.ABORT
    assert result2["reason"] == "already_configured"


async def test_url_trailing_slash_stripped(hass) -> None:
    with patch(
        "custom_components.auto_cal.config_flow._validate_credentials",
        return_value=None,
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": "user"}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            user_input={
                CONF_URL: MOCK_URL + "/",
                CONF_API_KEY: MOCK_API_KEY,
            },
        )

    assert result["type"] == FlowResultType.CREATE_ENTRY
    assert not result["data"][CONF_URL].endswith("/")
