"""
Base class for prompt handlers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict

import mcp.types as types


class PromptHandler(ABC):
    """Wraps a single MCP prompt template."""

    def __init__(self, definition: types.Prompt) -> None:
        self._definition = definition

    @property
    def definition(self) -> types.Prompt:
        return self._definition

    @property
    def name(self) -> str:
        return self._definition.name

    @abstractmethod
    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        """Render the prompt with the given arguments."""
