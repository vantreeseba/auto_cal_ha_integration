"""Tests for Auto Cal habit entities (button, sensor, binary_sensor)."""
from __future__ import annotations

from unittest.mock import patch

import pytest


async def _setup(hass, mock_api_client, mock_config_entry):
    """Set up the config entry with the mock client and real coordinator."""
    with patch(
        "custom_components.auto_cal.AutoCalApiClient",
        return_value=mock_api_client,
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()


async def test_habit_entities_created(hass, mock_api_client, mock_config_entry):
    """Each habit yields a button, two sensors, and a binary sensor."""
    await _setup(hass, mock_api_client, mock_config_entry)

    # 2 habits → 2 buttons, 4 sensors (progress + rate each), 2 binary sensors.
    assert len(hass.states.async_all("button")) == 2
    assert len(hass.states.async_all("sensor")) == 4
    assert len(hass.states.async_all("binary_sensor")) == 2


async def test_habit_progress_sensor_value(hass, mock_api_client, mock_config_entry):
    await _setup(hass, mock_api_client, mock_config_entry)

    progress = next(
        s
        for s in hass.states.async_all("sensor")
        if "Exercise Progress" in (s.attributes.get("friendly_name") or "")
    )
    assert progress.state == "2"
    assert progress.attributes["target"] == 3
    assert progress.attributes["remaining"] == 1
    assert progress.attributes["activity_type"] == "Personal"


async def test_habit_goal_met_binary_sensor(hass, mock_api_client, mock_config_entry):
    await _setup(hass, mock_api_client, mock_config_entry)

    states = {
        s.attributes.get("friendly_name"): s.state
        for s in hass.states.async_all("binary_sensor")
    }
    # habit-1: 2/3 → not met; habit-2: 5/5 → met.
    assert states["Exercise Goal met"] == "off"
    assert states["Read Goal met"] == "on"


async def test_habit_complete_button(hass, mock_api_client, mock_config_entry):
    """Pressing the button records a completion via the client."""
    await _setup(hass, mock_api_client, mock_config_entry)

    button = next(
        s
        for s in hass.states.async_all("button")
        if "Exercise" in (s.attributes.get("friendly_name") or "")
    )
    await hass.services.async_call(
        "button",
        "press",
        target={"entity_id": button.entity_id},
        blocking=True,
    )

    mock_api_client.complete_habit.assert_called_once_with("habit-1")
