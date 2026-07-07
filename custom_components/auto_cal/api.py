"""Auto Cal API client."""
from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)

GRAPHQL_TIMEOUT = aiohttp.ClientTimeout(total=30)
_WS_TIMEOUT = aiohttp.ClientWSTimeout(ws_close=10)
_WS_SUBPROTOCOL = "graphql-transport-ws"


class AutoCalApiError(Exception):
    """Base exception for Auto Cal API errors."""


class AutoCalConnectionError(AutoCalApiError):
    """Failed to connect to the Auto Cal server."""


class AutoCalAuthError(AutoCalApiError):
    """API key is invalid or lacks required scope."""


class AutoCalApiClient:
    """Async client for the Auto Cal API."""

    def __init__(
        self,
        url: str,
        api_key: str,
        session: aiohttp.ClientSession,
    ) -> None:
        base = url.rstrip("/")
        self._graphql_url = f"{base}/graphql"
        self._ical_url = f"{base}/ical"
        self._api_key = api_key
        self._session = session

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    async def get_todo_lists(self) -> list[dict[str, Any]]:
        result = await self._graphql(
            """
            query MyTodoLists {
              myTodoLists {
                id name description defaultPriority defaultEstimatedLength
                activityType { id name color }
              }
            }
            """
        )
        return result["data"]["myTodoLists"]

    async def get_todos(self, list_id: str | None = None) -> list[dict[str, Any]]:
        result = await self._graphql(
            """
            query MyTodos($listId: ID) {
              myTodos(listId: $listId) {
                id title description priority estimatedLength
                dueAt scheduledAt completedAt manuallyScheduled
                list { id name }
              }
            }
            """,
            variables={"listId": list_id},
        )
        return result["data"]["myTodos"]

    async def get_habits(self) -> list[dict[str, Any]]:
        result = await self._graphql(
            """
            query MyHabits {
              myHabits {
                id title description priority estimatedLength
                frequencyCount frequencyUnit
                activityType { id name color }
              }
            }
            """
        )
        return result["data"]["myHabits"]

    async def get_habit_detail(
        self, habit_id: str, periods: int = 8
    ) -> dict[str, Any]:
        result = await self._graphql(
            """
            query MyHabitDetail($id: ID!, $periods: Int) {
              myHabitDetail(habitId: $id, periods: $periods) {
                habitId title totalCompletions allTimeRate
                periods { label completions target rate }
              }
            }
            """,
            variables={"id": habit_id, "periods": periods},
        )
        return result["data"]["myHabitDetail"]

    async def get_ical(self) -> str:
        try:
            async with self._session.get(
                self._ical_url,
                params={"secret": self._api_key},
                timeout=GRAPHQL_TIMEOUT,
            ) as resp:
                if resp.status in (401, 403):
                    raise AutoCalAuthError(f"iCal endpoint returned {resp.status}")
                resp.raise_for_status()
                return await resp.text()
        except AutoCalApiError:
            raise
        except aiohttp.ClientConnectionError as err:
            raise AutoCalConnectionError(f"Cannot connect to {self._ical_url}") from err
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            raise AutoCalConnectionError(f"Request failed: {err}") from err

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    async def create_todo(
        self,
        list_id: str,
        title: str,
        description: str | None = None,
        due_at: str | None = None,
    ) -> dict[str, Any]:
        input_data: dict[str, Any] = {"listId": list_id, "title": title}
        if description is not None:
            input_data["description"] = description
        if due_at is not None:
            input_data["dueAt"] = due_at
        result = await self._graphql(
            """
            mutation CreateTodo($input: CreateTodoArgs!) {
              myCreateTodo(input: $input) {
                id title priority dueAt scheduledAt
              }
            }
            """,
            variables={"input": input_data},
        )
        return result["data"]["myCreateTodo"]

    async def update_todo(self, todo_id: str, **fields: Any) -> dict[str, Any]:
        """Update arbitrary fields on a todo. Pass field=None to clear nullable fields."""
        input_data: dict[str, Any] = {"id": todo_id, **fields}
        result = await self._graphql(
            """
            mutation UpdateTodo($input: UpdateTodoArgs!) {
              myUpdateTodo(input: $input) {
                id title priority dueAt scheduledAt completedAt manuallyScheduled
              }
            }
            """,
            variables={"input": input_data},
        )
        return result["data"]["myUpdateTodo"]

    async def complete_todo(self, todo_id: str) -> dict[str, Any]:
        result = await self._graphql(
            """
            mutation CompleteTodo($id: ID!) {
              myCompleteTodo(id: $id) { id completedAt }
            }
            """,
            variables={"id": todo_id},
        )
        return result["data"]["myCompleteTodo"]

    async def delete_todo(self, todo_id: str) -> bool:
        result = await self._graphql(
            """
            mutation DeleteTodo($id: ID!) {
              myDeleteTodo(id: $id)
            }
            """,
            variables={"id": todo_id},
        )
        return result["data"]["myDeleteTodo"]

    async def complete_habit(self, habit_id: str) -> dict[str, Any]:
        """Record a completion for a habit at the current time."""
        result = await self._graphql(
            """
            mutation CompleteHabit($input: CompleteHabitArgs!) {
              myCompleteHabit(input: $input) { id completedAt }
            }
            """,
            variables={"input": {"habitId": habit_id}},
        )
        return result["data"]["myCompleteHabit"]

    # ------------------------------------------------------------------
    # Subscriptions
    # ------------------------------------------------------------------

    async def subscribe_todo_updates(self) -> AsyncIterator[dict[str, Any]]:
        """Yield graphql-ws subscription events for todos and todo lists.

        Connects via WebSocket, subscribes to myTodosUpdated and
        myTodoListsUpdated, and yields each 'next' message payload.
        Raises AutoCalConnectionError on network failure.
        """
        ws_url = (
            self._graphql_url
            .replace("http://", "ws://", 1)
            .replace("https://", "wss://", 1)
        )
        try:
            async with self._session.ws_connect(
                ws_url,
                protocols=[_WS_SUBPROTOCOL],
                timeout=_WS_TIMEOUT,
            ) as ws:
                await ws.send_json({
                    "type": "connection_init",
                    "payload": {"authorization": f"Bearer {self._api_key}"},
                })
                raw = await ws.receive()
                if raw.type != aiohttp.WSMsgType.TEXT:
                    raise AutoCalConnectionError("WS handshake failed: no text response")
                ack = json.loads(raw.data)
                if ack.get("type") != "connection_ack":
                    raise AutoCalConnectionError(
                        f"WS handshake failed: expected connection_ack, got {ack.get('type')!r}"
                    )

                for sub_id, query in (
                    ("todos", "subscription { myTodosUpdated { type } }"),
                    ("lists", "subscription { myTodoListsUpdated { type } }"),
                ):
                    await ws.send_json({
                        "type": "subscribe",
                        "id": sub_id,
                        "payload": {"query": query},
                    })

                async for raw in ws:
                    if raw.type == aiohttp.WSMsgType.TEXT:
                        msg = json.loads(raw.data)
                        msg_type = msg.get("type")
                        if msg_type == "next":
                            yield msg
                        elif msg_type == "ping":
                            await ws.send_json({"type": "pong"})
                        elif msg_type == "error":
                            raise AutoCalApiError(f"Subscription error: {msg.get('payload')}")
                        elif msg_type == "complete":
                            return
                    elif raw.type in (
                        aiohttp.WSMsgType.CLOSE,
                        aiohttp.WSMsgType.CLOSING,
                        aiohttp.WSMsgType.ERROR,
                    ):
                        raise AutoCalConnectionError(f"WebSocket closed: {raw.type.name}")
        except AutoCalApiError:
            raise
        except aiohttp.ClientConnectionError as err:
            raise AutoCalConnectionError(f"Cannot connect to {ws_url}") from err
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            raise AutoCalConnectionError(f"WebSocket error: {err}") from err

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _graphql(
        self,
        query: str,
        variables: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"query": query}
        if variables:
            payload["variables"] = variables

        try:
            async with self._session.post(
                self._graphql_url,
                json=payload,
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=GRAPHQL_TIMEOUT,
            ) as resp:
                if resp.status in (401, 403):
                    raise AutoCalAuthError(f"GraphQL returned {resp.status}")
                resp.raise_for_status()
                data = await resp.json()
        except AutoCalApiError:
            raise
        except aiohttp.ClientConnectionError as err:
            raise AutoCalConnectionError(
                f"Cannot connect to {self._graphql_url}"
            ) from err
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            raise AutoCalConnectionError(f"Request failed: {err}") from err

        if "errors" in data:
            raise AutoCalApiError(f"GraphQL errors: {data['errors']}")

        return data
