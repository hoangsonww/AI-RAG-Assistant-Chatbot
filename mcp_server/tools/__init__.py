"""
Tool registry — collects tool handlers from every category module.
"""

from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from ..config import ServerConfig

from .base import ToolHandler
from . import (
    pipeline_tools,
    knowledge_tools,
    code_tools,
    file_tools,
    web_tools,
    data_tools,
    git_tools,
    system_tools,
)

__all__ = ["registry"]

_MODULES = [
    ("pipeline", pipeline_tools),
    ("knowledge", knowledge_tools),
    ("code", code_tools),
    ("file", file_tools),
    ("web", web_tools),
    ("data", data_tools),
    ("git", git_tools),
    ("system", system_tools),
]


class _ToolRegistry:
    """Builds the full tool-handler map from category modules."""

    def build(self, cfg: "ServerConfig") -> Dict[str, ToolHandler]:
        handlers: Dict[str, ToolHandler] = {}
        for category, module in _MODULES:
            if cfg.is_tool_enabled(category):
                category_handlers = module.register(cfg)
                handlers.update(category_handlers)
        return handlers


registry = _ToolRegistry()
