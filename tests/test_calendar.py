"""Tests for AutoCalCalendarEntity."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from custom_components.auto_cal.coordinator import _parse_ical_events

from .conftest import MOCK_ICAL


def _make_event(uid: str, summary: str, start: datetime, end: datetime):
    return {"uid": uid, "summary": summary, "start": start, "end": end, "description": None}


def test_parse_event_start_end_are_aware():
    events = _parse_ical_events(MOCK_ICAL.decode())
    for e in events:
        assert e["start"].tzinfo is not None
        assert e["end"].tzinfo is not None


def test_parse_event_end_after_start():
    events = _parse_ical_events(MOCK_ICAL.decode())
    for e in events:
        assert e["end"] > e["start"]


def test_parse_multi_event_ical():
    ical = (
        "BEGIN:VCALENDAR\nVERSION:2.0\n"
        "BEGIN:VEVENT\nUID:a@x\nDTSTART:20260514T090000Z\nDTEND:20260514T100000Z\nSUMMARY:A\nEND:VEVENT\n"
        "BEGIN:VEVENT\nUID:b@x\nDTSTART:20260515T100000Z\nDTEND:20260515T110000Z\nSUMMARY:B\nEND:VEVENT\n"
        "END:VCALENDAR\n"
    )
    events = _parse_ical_events(ical)
    assert len(events) == 2
    summaries = {e["summary"] for e in events}
    assert summaries == {"A", "B"}


async def test_calendar_entity_state(hass, mock_api_client, mock_config_entry):
    """Calendar entity is created and its state shows the next scheduled event."""
    with patch(
        "custom_components.auto_cal.coordinator.AutoCalCoordinator._async_update_data",
        return_value={
            "todo_lists": [],
            "todos_by_list": {},
            "ical_events": _parse_ical_events(MOCK_ICAL.decode()),
        },
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()

    states = hass.states.async_all("calendar")
    assert len(states) == 1
    # HA writes the upcoming event summary into the "message" attribute.
    assert states[0].attributes.get("message") == "Write tests"


def test_event_filter_in_range():
    """Events within the requested date range are included."""
    from custom_components.auto_cal.calendar import _to_calendar_event

    ical_events = _parse_ical_events(MOCK_ICAL.decode())
    start = datetime(2026, 5, 14, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 5, 14, 23, 59, tzinfo=timezone.utc)

    filtered = [
        _to_calendar_event(e)
        for e in ical_events
        if e["start"] < end and e["end"] > start
    ]
    assert len(filtered) == 1
    assert filtered[0].summary == "Write tests"


def test_event_filter_outside_range():
    """Events outside the requested date range are excluded."""
    from custom_components.auto_cal.calendar import _to_calendar_event

    ical_events = _parse_ical_events(MOCK_ICAL.decode())
    start = datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 6, 30, 23, 59, tzinfo=timezone.utc)

    filtered = [
        _to_calendar_event(e)
        for e in ical_events
        if e["start"] < end and e["end"] > start
    ]
    assert filtered == []
