"""
Resource registry — collects resource handlers from category modules.
"""

from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from ..config import ServerConfig

from .base import ResourceHandler
from . import pipeline_resources, knowledge_resources, system_resources

__all__ = ["registry"]

_MODULES = [
    ("pipeline", pipeline_resources),
    ("knowledge", knowledge_resources),
    ("system", system_resources),
]


class _ResourceRegistry:
    def build(self, cfg: "ServerConfig") -> Dict[str, ResourceHandler]:
        handlers: Dict[str, ResourceHandler] = {}
        for category, module in _MODULES:
            if cfg.is_resource_enabled(category):
                handlers.update(module.register(cfg))
        return handlers


registry = _ResourceRegistry()
