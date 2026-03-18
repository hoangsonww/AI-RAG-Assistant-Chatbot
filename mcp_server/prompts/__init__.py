"""
Prompt registry — collects prompt handlers.
"""

from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from ..config import ServerConfig

from .base import PromptHandler
from .prompt_library import register as register_prompts

__all__ = ["registry"]


class _PromptRegistry:
    def build(self, cfg: "ServerConfig") -> Dict[str, PromptHandler]:
        if not cfg.prompts_enabled:
            return {}
        return register_prompts(cfg)


registry = _PromptRegistry()
