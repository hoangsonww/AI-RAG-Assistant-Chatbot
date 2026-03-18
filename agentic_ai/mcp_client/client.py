"""
MCP Client — connects to the standalone Lumina MCP Server and exposes
tool invocation, resource reading, and prompt retrieval.

Supports both stdio (subprocess) and direct in-process connections.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from typing import Any, Dict, List, Optional

from ..utils.logger import get_logger

_logger = get_logger("mcp_client")


class MCPClient:
    """Client that communicates with the Lumina MCP Server.

    For the agentic pipeline, we use **direct in-process** invocation
    (bypassing stdio transport) for maximum performance.  The client
    imports tool handlers from ``mcp_server`` and calls them directly.
    """

    def __init__(
        self,
        *,
        server_config_path: Optional[str] = None,
        mode: str = "direct",
    ) -> None:
        """
        Args:
            server_config_path: Path to MCP server config YAML (optional).
            mode: ``"direct"`` (in-process, default) or ``"stdio"``
                  (subprocess, for cross-process isolation).
        """
        self._mode = mode
        self._config_path = server_config_path
        self._tool_handlers: Dict[str, Any] = {}
        self._resource_handlers: Dict[str, Any] = {}
        self._prompt_handlers: Dict[str, Any] = {}
        self._initialised = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    async def initialise(self) -> None:
        """Load tool / resource / prompt registries from the MCP server."""
        if self._initialised:
            return

        if self._mode == "direct":
            await self._init_direct()
        else:
            _logger.info("stdio mode — tools will be called via subprocess")

        self._initialised = True
        _logger.info(
            "MCP client initialised (%s mode) — %d tools available",
            self._mode,
            len(self._tool_handlers),
        )

    async def _init_direct(self) -> None:
        """Import registries directly from the mcp_server package."""
        try:
            from mcp_server.config import load_config
            from mcp_server.tools import registry as tool_registry
            from mcp_server.resources import registry as resource_registry
            from mcp_server.prompts import registry as prompt_registry

            cfg = load_config(self._config_path)
            self._tool_handlers = tool_registry.build(cfg)
            self._resource_handlers = resource_registry.build(cfg)
            self._prompt_handlers = prompt_registry.build(cfg)
        except ImportError as exc:
            _logger.warning(
                "mcp_server package not importable (%s) — "
                "tools will not be available",
                exc,
            )

    # ------------------------------------------------------------------
    # Tool invocation
    # ------------------------------------------------------------------
    async def call_tool(self, name: str, arguments: Optional[Dict[str, Any]] = None) -> Any:
        """Call a tool by name and return its result."""
        await self.initialise()
        arguments = arguments or {}

        if self._mode == "direct":
            handler = self._tool_handlers.get(name)
            if handler is None:
                return {"error": f"Tool '{name}' not found"}
            return await handler.execute(arguments)
        else:
            return await self._call_tool_stdio(name, arguments)

    async def _call_tool_stdio(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool via stdio subprocess (fallback mode)."""
        # Construct a minimal JSON-RPC request
        request = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        })
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "mcp_server",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(request.encode()), timeout=60
            )
            return json.loads(stdout.decode()) if stdout else {"error": stderr.decode()}
        except Exception as exc:
            return {"error": str(exc)}

    # ------------------------------------------------------------------
    # Resource reading
    # ------------------------------------------------------------------
    async def read_resource(self, uri: str) -> str:
        """Read a resource by URI."""
        await self.initialise()
        handler = self._resource_handlers.get(uri)
        if handler is None:
            return json.dumps({"error": f"Resource '{uri}' not found"})
        return await handler.read()

    # ------------------------------------------------------------------
    # Prompt retrieval
    # ------------------------------------------------------------------
    async def get_prompt(self, name: str, arguments: Optional[Dict[str, str]] = None) -> Any:
        """Render a prompt template."""
        await self.initialise()
        handler = self._prompt_handlers.get(name)
        if handler is None:
            return {"error": f"Prompt '{name}' not found"}
        return await handler.render(arguments or {})

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------
    def list_tools(self) -> List[str]:
        return list(self._tool_handlers.keys())

    def list_resources(self) -> List[str]:
        return list(self._resource_handlers.keys())

    def list_prompts(self) -> List[str]:
        return list(self._prompt_handlers.keys())

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Return tool schemas for consumption by agents."""
        return [
            {
                "name": h.definition.name,
                "description": h.definition.description,
                "input_schema": h.definition.inputSchema,
            }
            for h in self._tool_handlers.values()
        ]
