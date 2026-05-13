"""Auto Cal API client."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)

GRAPHQL_TIMEOUT = aiohttp.ClientTimeout(total=30)


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
