---
name: mcp-server
description: Use when developing or maintaining the standalone MCP server at mcp_server/, including adding tools, resources, prompts, changing middleware, configuration, or transport behavior.
---

# MCP Server

Use this skill for the standalone MCP server package at `mcp_server/`.

## First read

- `@mcp_server/CLAUDE.md`
- `@mcp_server/README.md`

## Architecture

- `server.py`: LuminaMCPServer with handler registration and dual transport (stdio + SSE).
- `tools/`: 8 category modules, 32 tools total. Each subclasses `ToolHandler(ABC)`.
- `resources/`: 7 read-only data endpoints via `lumina://` URIs.
- `prompts/`: 6 parameterized prompt templates.
- `middleware/`: composable chain of auth, rate limiting, and validation.
- `config.py`: deep-merge configuration (defaults → file → env vars).

## Workflow

1. Tool names and `input_schema` are external contracts — rename carefully.
2. New tools: subclass `ToolHandler(ABC)`, register in the category module's `register(cfg)`.
3. New categories: add a module in `tools/`, register in `tools/__init__.py`.
4. Keep middleware composable via `MiddlewareChain`.
5. Configuration changes flow through `ServerConfig`, not hardcoded values.

## Validation

- `python -m compileall mcp_server`
- `python -m mcp_server --log-level DEBUG` when dependencies are installed.

## Common traps

- The `agentic_ai/mcp_client/` imports tool handlers directly in "direct" mode — keep handler signatures stable.
- Pipeline and knowledge tools may need external services to return meaningful data.
- The `_ToolRegistry` auto-discovers category modules — verify new modules are imported.
