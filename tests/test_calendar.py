"""Tests for AutoCalCalendarEntity."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from freezegun import freeze_time

from custom_components.auto_cal.coordinator import (
    _parse_ical_blocks,
    _parse_ical_events,
)

from .conftest import MOCK_BLOCKS_ICAL, MOCK_ICAL


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


@freeze_time("2026-05-14T09:30:00Z")
async def test_calendar_entity_state(hass, mock_api_client, mock_config_entry):
    """Calendar entity is created and its state shows the next scheduled event.

    Clock is pinned inside the mock event's window so this stays deterministic
    regardless of the real date.
    """
    with patch(
        "custom_components.auto_cal.coordinator.AutoCalCoordinator._async_update_data",
        return_value={
            "todo_lists": [],
            "todos_by_list": {},
            "ical_events": _parse_ical_events(MOCK_ICAL.decode()),
            "block_events": _parse_ical_blocks(MOCK_BLOCKS_ICAL.decode()),
            "habits": [],
            "habit_progress": {},
        },
    ):
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()

    states = hass.states.async_all("calendar")
    # Two calendars: the schedule and the recurring time blocks.
    assert len(states) == 2
    by_name = {s.attributes.get("friendly_name"): s for s in states}
    schedule = by_name["auto-cal.local:4000 Schedule"]
    # HA writes the upcoming event summary into the "message" attribute.
    assert schedule.attributes.get("message") == "Write tests"


def test_parse_blocks_keeps_rrule():
    """Block parsing keeps the raw RRULE and aware template times."""
    blocks = _parse_ical_blocks(MOCK_BLOCKS_ICAL.decode())
    assert len(blocks) == 1
    block = blocks[0]
    assert block["summary"] == "Deep Work"
    assert block["rrule"] == "FREQ=WEEKLY;BYDAY=MO"
    assert block["start"].tzinfo is not None
    assert block["end"] > block["start"]


def test_expand_blocks_weekly_occurrences():
    """A weekly block expands to one occurrence per Monday in the range."""
    from custom_components.auto_cal.calendar import _expand_blocks

    blocks = _parse_ical_blocks(MOCK_BLOCKS_ICAL.decode())
    start = datetime(2026, 5, 11, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc)  # Mondays: 11, 18, 25

    events = _expand_blocks(blocks, start, end)
    assert len(events) == 3
    assert all(e.summary == "Deep Work" for e in events)
    assert {e.start.date().isoformat() for e in events} == {
        "2026-05-11",
        "2026-05-18",
        "2026-05-25",
    }
    # Occurrences carry a stable, unique per-date UID.
    assert len({e.uid for e in events}) == 3


def test_expand_blocks_includes_currently_running():
    """An occurrence that started before the range but still runs is included."""
    from custom_components.auto_cal.calendar import _expand_blocks

    blocks = _parse_ical_blocks(MOCK_BLOCKS_ICAL.decode())
    # 10:00 falls inside the 09:00–12:00 Monday block.
    start = datetime(2026, 5, 11, 10, 0, tzinfo=timezone.utc)
    end = datetime(2026, 5, 11, 11, 0, tzinfo=timezone.utc)

    events = _expand_blocks(blocks, start, end)
    assert len(events) == 1
    assert events[0].start.hour == 9


def test_expand_blocks_outside_range():
    """No occurrences are returned for a range before the block starts."""
    from custom_components.auto_cal.calendar import _expand_blocks

    blocks = _parse_ical_blocks(MOCK_BLOCKS_ICAL.decode())
    start = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 1, 8, 0, 0, tzinfo=timezone.utc)

    assert _expand_blocks(blocks, start, end) == []


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
