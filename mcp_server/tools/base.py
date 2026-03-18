"""
Base classes for tool handlers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict

import mcp.types as types


class ToolHandler(ABC):
    """A single MCP tool with its schema and execution logic."""

    def __init__(self, definition: types.Tool) -> None:
        self._definition = definition

    @property
    def definition(self) -> types.Tool:
        return self._definition

    @property
    def name(self) -> str:
        return self._definition.name

    @abstractmethod
    async def execute(self, arguments: Dict[str, Any]) -> Any:
        """Execute the tool and return a JSON-serialisable result."""
