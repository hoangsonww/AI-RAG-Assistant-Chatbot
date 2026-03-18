"""
Tool adapter — wraps MCP tools as LangChain-compatible tools
so the pipeline agents can call them through the standard interface.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..utils.logger import get_logger

_logger = get_logger("tool_adapter")


class MCPToolAdapter:
    """Wraps an MCP tool handler into a LangChain-style callable tool.

    This lets each pipeline agent invoke MCP tools with the same interface
    they use for any LangChain tool.
    """

    def __init__(self, name: str, description: str, handler: Any) -> None:
        self.name = name
        self.description = description
        self._handler = handler

    async def ainvoke(self, arguments: Dict[str, Any]) -> Any:
        """Async invocation (primary path for the pipeline)."""
        return await self._handler.execute(arguments)

    def invoke(self, arguments: Dict[str, Any]) -> Any:
        """Sync invocation (fallback, runs the async handler in a new loop)."""
        import asyncio

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(
                    asyncio.run, self._handler.execute(arguments)
                ).result()
        return asyncio.run(self._handler.execute(arguments))

    def __repr__(self) -> str:
        return f"MCPToolAdapter(name={self.name!r})"


# ------------------------------------------------------------------
# Agent-specific tool mapping
# ------------------------------------------------------------------

# Defines which MCP tools each agent type should receive.
_AGENT_TOOL_MAP: Dict[str, List[str]] = {
    "planner": [
        "get_project_structure",
        "search_code",
        "read_file",
        "list_available_tools",
        "health_check",
    ],
    "researcher": [
        "search_knowledge",
        "search_code",
        "read_file",
        "fetch_url",
        "extract_content",
        "list_directory",
        "search_files",
        "get_project_structure",
        "git_log",
    ],
    "analyzer": [
        "analyze_file",
        "search_code",
        "read_file",
        "parse_csv",
        "parse_json",
        "transform_data",
    ],
    "synthesizer": [
        "search_knowledge",
        "read_file",
        "fetch_url",
    ],
    "validator": [
        "search_code",
        "read_file",
        "analyze_file",
        "environment_check",
    ],
    "executor": [
        "read_file",
        "write_file",
        "list_directory",
        "search_files",
        "fetch_url",
        "git_status",
        "git_diff",
        "search_code",
        "run_pipeline",
    ],
    "reviewer": [
        "read_file",
        "git_diff",
        "git_log",
        "search_code",
        "analyze_file",
        "get_server_metrics",
    ],
}


def create_agent_tools(
    mcp_client: Any,
    agent_name: str,
    *,
    extra_tools: Optional[List[str]] = None,
) -> List[MCPToolAdapter]:
    """Build a list of tool adapters for a specific agent.

    Args:
        mcp_client: An initialised :class:`MCPClient`.
        agent_name: Agent name (e.g. ``"researcher"``).
        extra_tools: Additional tool names to include beyond the defaults.

    Returns:
        List of :class:`MCPToolAdapter` instances.
    """
    tool_names = list(_AGENT_TOOL_MAP.get(agent_name, []))
    if extra_tools:
        tool_names.extend(extra_tools)

    # De-duplicate while preserving order
    seen = set()
    unique: List[str] = []
    for n in tool_names:
        if n not in seen:
            seen.add(n)
            unique.append(n)

    adapters: List[MCPToolAdapter] = []
    handlers = mcp_client._tool_handlers  # noqa: direct access for efficiency

    for name in unique:
        handler = handlers.get(name)
        if handler is not None:
            adapters.append(
                MCPToolAdapter(
                    name=handler.definition.name,
                    description=handler.definition.description or "",
                    handler=handler,
                )
            )
        else:
            _logger.debug("Tool '%s' not available for agent '%s'", name, agent_name)

    _logger.info(
        "Created %d tools for agent '%s': %s",
        len(adapters),
        agent_name,
        [a.name for a in adapters],
    )
    return adapters
