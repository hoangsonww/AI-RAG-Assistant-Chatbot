# MCP Server Guide

## Scope

- `mcp_server/server.py`: core server class, handler registration, transport lifecycle.
- `mcp_server/config.py`: ServerConfig with deep merge, env overrides, dot-notation access.
- `mcp_server/tools/`: 8 tool category modules (32 tools total).
- `mcp_server/resources/`: pipeline, knowledge, and system resource handlers.
- `mcp_server/prompts/`: 6 prompt templates.
- `mcp_server/middleware/`: auth, rate limiting, input validation.

## Rules

- Treat tool names and input schemas as external contracts — rename carefully since MCP clients depend on them.
- Keep each tool category in its own module under `tools/`.
- Extend tool categories by subclassing `ToolHandler(ABC)` and registering in `tools/__init__.py`.
- Keep middleware composable through the `MiddlewareChain` pattern.
- Configuration flows through `ServerConfig`; do not hardcode environment-specific values.
- The `agentic_ai/mcp_client/` package imports tool handlers directly in "direct" mode; keep handler signatures stable.

## Validation

- Primary: `python -m compileall mcp_server`
- Startup check: `python -m mcp_server --log-level DEBUG` (requires dependencies installed)
- Do not assume external services (Pinecone, Git repos) are available during validation.

## Common commands

```bash
python -m mcp_server                                    # stdio transport
python -m mcp_server --transport sse --port 8080        # SSE transport
python -m mcp_server --config mcp_server/config/production.yaml
```
