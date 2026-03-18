"""
Core MCP Server for the Lumina platform.

Registers all tools, resources, and prompts, manages lifecycle,
and handles both stdio and SSE transports.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types

from .config import ServerConfig, load_config
from .middleware.rate_limiter import RateLimiter
from .utils.logger import get_logger, setup_logging
from .utils.errors import ToolExecutionError, ResourceNotFoundError, PromptNotFoundError

# Tool registries — imported lazily in _register_tools
from .tools import registry as tool_registry
from .resources import registry as resource_registry
from .prompts import registry as prompt_registry

_logger = get_logger("server")


class LuminaMCPServer:
    """Enterprise-grade MCP server exposing Lumina AI capabilities."""

    def __init__(self, config_path: Optional[str] = None) -> None:
        self.cfg = load_config(config_path)
        setup_logging(level=self.cfg.logging_config.get("level", "INFO"))

        self.server = Server(self.cfg.server_name)
        self.rate_limiter = RateLimiter(
            self.cfg.security.get("rate_limit", {}).get("requests_per_minute", 120)
        )

        # Initialise tool / resource / prompt registries
        self._tool_handlers = tool_registry.build(self.cfg)
        self._resource_handlers = resource_registry.build(self.cfg)
        self._prompt_handlers = prompt_registry.build(self.cfg)

        self._register_handlers()
        _logger.info(
            "Lumina MCP Server initialised — %d tools, %d resources, %d prompts",
            len(self._tool_handlers),
            len(self._resource_handlers),
            len(self._prompt_handlers),
        )

    # ------------------------------------------------------------------
    # Handler registration
    # ------------------------------------------------------------------
    def _register_handlers(self) -> None:
        # ---- Tools ----
        @self.server.list_tools()
        async def _list_tools() -> List[types.Tool]:
            return [h.definition for h in self._tool_handlers.values()]

        @self.server.call_tool()
        async def _call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent | types.ImageContent | types.EmbeddedResource]:
            self.rate_limiter.check(f"tool:{name}")
            handler = self._tool_handlers.get(name)
            if handler is None:
                raise ToolExecutionError(name, "Unknown tool")
            try:
                result = await handler.execute(arguments)
                return [
                    types.TextContent(
                        type="text",
                        text=json.dumps(result, indent=2, default=str),
                    )
                ]
            except Exception as exc:
                _logger.error("Tool %s failed: %s", name, exc)
                return [
                    types.TextContent(
                        type="text",
                        text=json.dumps(
                            {"error": str(exc), "tool": name}, indent=2
                        ),
                    )
                ]

        # ---- Resources ----
        @self.server.list_resources()
        async def _list_resources() -> List[types.Resource]:
            return [h.definition for h in self._resource_handlers.values()]

        @self.server.read_resource()
        async def _read_resource(uri: str) -> str:
            self.rate_limiter.check(f"resource:{uri}")
            handler = self._resource_handlers.get(uri)
            if handler is None:
                raise ResourceNotFoundError(uri)
            return await handler.read()

        # ---- Prompts ----
        @self.server.list_prompts()
        async def _list_prompts() -> List[types.Prompt]:
            return [h.definition for h in self._prompt_handlers.values()]

        @self.server.get_prompt()
        async def _get_prompt(
            name: str, arguments: Optional[Dict[str, str]] = None
        ) -> types.GetPromptResult:
            self.rate_limiter.check(f"prompt:{name}")
            handler = self._prompt_handlers.get(name)
            if handler is None:
                raise PromptNotFoundError(name)
            return await handler.render(arguments or {})

    # ------------------------------------------------------------------
    # Transport runners
    # ------------------------------------------------------------------
    async def run_stdio(self) -> None:
        """Run over stdin/stdout (default for CLI usage)."""
        _logger.info("Starting Lumina MCP Server on stdio transport …")
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name=self.cfg.server_name,
                    server_version=self.cfg.server_version,
                    capabilities=self.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )

    async def run_sse(self, host: str = "0.0.0.0", port: int = 8080) -> None:
        """Run over Server-Sent Events (HTTP)."""
        try:
            from mcp.server.sse import SseServerTransport
            from starlette.applications import Starlette
            from starlette.routing import Route
            import uvicorn
        except ImportError as exc:
            raise ImportError(
                "SSE transport requires 'starlette' and 'uvicorn'. "
                "Install with: pip install starlette uvicorn"
            ) from exc

        sse = SseServerTransport("/messages")

        async def handle_sse(request):
            async with sse.connect_sse(
                request.scope, request.receive, request._send
            ) as streams:
                await self.server.run(
                    streams[0],
                    streams[1],
                    InitializationOptions(
                        server_name=self.cfg.server_name,
                        server_version=self.cfg.server_version,
                        capabilities=self.server.get_capabilities(
                            notification_options=NotificationOptions(),
                            experimental_capabilities={},
                        ),
                    ),
                )

        app = Starlette(routes=[Route("/sse", endpoint=handle_sse)])
        _logger.info("Starting Lumina MCP Server on SSE transport at %s:%s", host, port)
        config = uvicorn.Config(app, host=host, port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()
