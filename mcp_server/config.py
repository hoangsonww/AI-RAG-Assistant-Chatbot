"""
Configuration management for the Lumina MCP Server.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml


_DEFAULT_CONFIG: Dict[str, Any] = {
    "server": {
        "name": "lumina-mcp-server",
        "version": "1.0.0",
        "description": "Enterprise-grade MCP server for Lumina AI platform",
    },
    "tools": {
        "pipeline": {"enabled": True},
        "knowledge": {"enabled": True},
        "code": {"enabled": True},
        "file": {"enabled": True, "allowed_roots": ["."]},
        "web": {"enabled": True, "timeout_seconds": 30},
        "data": {"enabled": True},
        "git": {"enabled": True},
        "system": {"enabled": True},
    },
    "resources": {
        "pipeline": {"enabled": True},
        "knowledge": {"enabled": True},
        "system": {"enabled": True},
    },
    "prompts": {"enabled": True},
    "security": {
        "api_key_required": False,
        "rate_limit": {"enabled": True, "requests_per_minute": 120},
        "max_file_size_bytes": 10_485_760,
        "blocked_extensions": [".exe", ".dll", ".so", ".dylib", ".bin"],
    },
    "logging": {
        "level": "INFO",
        "format": "%(asctime)s [%(name)s] %(levelname)s %(message)s",
    },
}


class ServerConfig:
    """Immutable-ish configuration wrapper with dot-notation access."""

    def __init__(self, data: Dict[str, Any]) -> None:
        self._data = data

    # ------------------------------------------------------------------
    # Convenience accessors
    # ------------------------------------------------------------------
    @property
    def server_name(self) -> str:
        return self._data["server"]["name"]

    @property
    def server_version(self) -> str:
        return self._data["server"]["version"]

    @property
    def tools_config(self) -> Dict[str, Any]:
        return self._data.get("tools", {})

    @property
    def resources_config(self) -> Dict[str, Any]:
        return self._data.get("resources", {})

    @property
    def prompts_enabled(self) -> bool:
        return self._data.get("prompts", {}).get("enabled", True)

    @property
    def security(self) -> Dict[str, Any]:
        return self._data.get("security", {})

    @property
    def logging_config(self) -> Dict[str, Any]:
        return self._data.get("logging", {})

    def is_tool_enabled(self, category: str) -> bool:
        return self.tools_config.get(category, {}).get("enabled", False)

    def is_resource_enabled(self, category: str) -> bool:
        return self.resources_config.get(category, {}).get("enabled", False)

    def get(self, dotted_key: str, default: Any = None) -> Any:
        """Retrieve a nested value using dot-separated key."""
        keys = dotted_key.split(".")
        node: Any = self._data
        for k in keys:
            if isinstance(node, dict):
                node = node.get(k)
            else:
                return default
            if node is None:
                return default
        return node

    @property
    def raw(self) -> Dict[str, Any]:
        return self._data


def load_config(config_path: Optional[str] = None) -> ServerConfig:
    """Load and merge configuration from file + env overrides."""
    data = _deep_copy(_DEFAULT_CONFIG)

    if config_path:
        file_data = _load_file(config_path)
        data = _deep_merge(data, file_data)

    # Allow env-var overrides for critical settings
    if os.getenv("MCP_SERVER_NAME"):
        data["server"]["name"] = os.environ["MCP_SERVER_NAME"]
    if os.getenv("MCP_LOG_LEVEL"):
        data["logging"]["level"] = os.environ["MCP_LOG_LEVEL"]
    if os.getenv("MCP_RATE_LIMIT"):
        data["security"]["rate_limit"]["requests_per_minute"] = int(
            os.environ["MCP_RATE_LIMIT"]
        )

    return ServerConfig(data)


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------

def _load_file(path: str) -> Dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(p) as fh:
        if p.suffix in (".yaml", ".yml"):
            return yaml.safe_load(fh) or {}
        elif p.suffix == ".json":
            return json.load(fh)
        raise ValueError(f"Unsupported config format: {p.suffix}")


def _deep_merge(base: Dict, override: Dict) -> Dict:
    merged = base.copy()
    for k, v in override.items():
        if k in merged and isinstance(merged[k], dict) and isinstance(v, dict):
            merged[k] = _deep_merge(merged[k], v)
        else:
            merged[k] = v
    return merged


def _deep_copy(d: Dict) -> Dict:
    import copy
    return copy.deepcopy(d)
