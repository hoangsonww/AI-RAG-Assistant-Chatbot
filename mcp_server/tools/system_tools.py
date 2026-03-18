"""
System diagnostics and health-check tools.
"""

from __future__ import annotations

import os
import platform
import sys
from datetime import datetime, timezone
from typing import Any, Dict

import mcp.types as types

from .base import ToolHandler
from ..utils.logger import get_logger

_logger = get_logger("tools.system")

_START_TIME = datetime.now(timezone.utc)


class HealthCheckTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="health_check",
                description="Check if the MCP server is healthy and report uptime.",
                inputSchema={"type": "object", "properties": {}},
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        now = datetime.now(timezone.utc)
        uptime = (now - _START_TIME).total_seconds()
        return {
            "status": "healthy",
            "uptime_seconds": round(uptime, 1),
            "started_at": _START_TIME.isoformat(),
            "timestamp": now.isoformat(),
        }


class SystemInfoTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="system_info",
                description="Return system metadata: OS, Python version, working directory, environment info.",
                inputSchema={"type": "object", "properties": {}},
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        return {
            "os": platform.system(),
            "os_release": platform.release(),
            "os_version": platform.version(),
            "architecture": platform.machine(),
            "python_version": sys.version,
            "cwd": os.getcwd(),
            "hostname": platform.node(),
            "cpu_count": os.cpu_count(),
        }


class GetServerConfigTool(ToolHandler):
    """Expose the running server configuration (sans secrets)."""

    def __init__(self, cfg: Any = None) -> None:
        self._cfg = cfg
        super().__init__(
            types.Tool(
                name="get_server_config",
                description="Return the current MCP server configuration (secrets redacted).",
                inputSchema={"type": "object", "properties": {}},
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        if self._cfg is None:
            return {"success": False, "error": "Config not available"}
        data = dict(self._cfg.raw)
        # Redact secrets
        if "security" in data:
            data["security"] = {k: "***" if "key" in k.lower() else v for k, v in data["security"].items()}
        return {"success": True, "config": data}


class GetMetricsTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="get_server_metrics",
                description=(
                    "Return server-level metrics: request counts, tool call stats, "
                    "and uptime information."
                ),
                inputSchema={"type": "object", "properties": {}},
            )
        )
        self._tool_calls: Dict[str, int] = {}
        self._total_calls = 0

    def record_call(self, tool_name: str) -> None:
        self._tool_calls[tool_name] = self._tool_calls.get(tool_name, 0) + 1
        self._total_calls += 1

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        now = datetime.now(timezone.utc)
        return {
            "uptime_seconds": round((now - _START_TIME).total_seconds(), 1),
            "total_tool_calls": self._total_calls,
            "tool_call_breakdown": dict(self._tool_calls),
            "timestamp": now.isoformat(),
        }


class ListAvailableToolsTool(ToolHandler):
    """Meta-tool: lists all registered tools with their descriptions."""

    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="list_available_tools",
                description="List all tools registered on this MCP server with their descriptions.",
                inputSchema={"type": "object", "properties": {}},
            )
        )
        self._all_tools: Dict[str, str] = {}

    def set_tool_map(self, tools: Dict[str, Any]) -> None:
        self._all_tools = {name: h.definition.description or "" for name, h in tools.items()}

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        return {
            "tools": [
                {"name": name, "description": desc}
                for name, desc in sorted(self._all_tools.items())
            ],
            "total": len(self._all_tools),
        }


class EnvironmentCheckTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="environment_check",
                description=(
                    "Verify that required environment variables and dependencies are available. "
                    "Reports which optional integrations are configured."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "check_vars": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Environment variables to check",
                        }
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        vars_to_check = arguments.get("check_vars", [
            "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "PINECONE_API_KEY",
            "MONGODB_URI", "GEMINI_API_KEY", "LANGCHAIN_API_KEY",
        ])
        results = {}
        for var in vars_to_check:
            val = os.getenv(var)
            results[var] = "set" if val else "not set"

        deps = {}
        for pkg in ["mcp", "langchain", "langgraph", "openai", "anthropic", "fastapi", "pydantic"]:
            try:
                __import__(pkg)
                deps[pkg] = "available"
            except ImportError:
                deps[pkg] = "not installed"

        return {"env_vars": results, "dependencies": deps}


def register(cfg: Any) -> Dict[str, ToolHandler]:
    config_tool = GetServerConfigTool(cfg)
    return {
        h.name: h
        for h in [
            HealthCheckTool(),
            SystemInfoTool(),
            config_tool,
            GetMetricsTool(),
            ListAvailableToolsTool(),
            EnvironmentCheckTool(),
        ]
    }
