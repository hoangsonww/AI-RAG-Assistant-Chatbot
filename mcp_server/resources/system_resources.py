"""
System-level resources.
"""

from __future__ import annotations

import json
import os
import platform
import sys
from datetime import datetime, timezone
from typing import Any, Dict

import mcp.types as types

from .base import ResourceHandler


class ServerInfoResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://system/info",
                name="System Information",
                description="Runtime environment information: OS, Python, working directory",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        return json.dumps({
            "os": platform.system(),
            "os_release": platform.release(),
            "python_version": sys.version,
            "cwd": os.getcwd(),
            "hostname": platform.node(),
            "architecture": platform.machine(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }, indent=2)


class ServerCapabilitiesResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://system/capabilities",
                name="Server Capabilities",
                description="MCP server capability summary — available tool categories and features",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        return json.dumps({
            "tool_categories": [
                "pipeline", "knowledge", "code", "file", "web", "data", "git", "system"
            ],
            "resource_categories": ["pipeline", "knowledge", "system"],
            "transports": ["stdio", "sse"],
            "features": [
                "rate_limiting", "api_key_auth", "input_validation",
                "structured_logging", "metrics_collection",
            ],
        }, indent=2)


def register(cfg: Any) -> Dict[str, ResourceHandler]:
    handlers = [ServerInfoResource(), ServerCapabilitiesResource()]
    return {h.uri: h for h in handlers}
