"""
Base class for resource handlers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import mcp.types as types


class ResourceHandler(ABC):
    """Wraps a single MCP resource."""

    def __init__(self, definition: types.Resource) -> None:
        self._definition = definition

    @property
    def definition(self) -> types.Resource:
        return self._definition

    @property
    def uri(self) -> str:
        return str(self._definition.uri)

    @abstractmethod
    async def read(self) -> str:
        """Return the resource content as a string."""
