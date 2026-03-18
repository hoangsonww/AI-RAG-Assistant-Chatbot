---
name: lumina-mcp-server
description: Develop and maintain the standalone Lumina MCP server. Use when editing files under mcp_server/, adding or modifying tools, resources, prompts, middleware, configuration, or transport behavior for the Model Context Protocol server.
---

# Lumina MCP Server

## Overview

Use this skill for the standalone MCP server at `mcp_server/`. The server implements the Model Context Protocol with 32 tools across 8 categories, 7 resources, and 6 prompts.

## Load The Right Reference

- Read `references/file-map.md` to locate the tool, resource, prompt, or middleware that owns a behavior.
- Read `references/tool-development.md` when adding or modifying MCP tools.

## Preserve The MCP Contract

- Tool names and `input_schema` definitions are external contracts — MCP clients depend on them.
- Keep each tool category in its own module under `tools/`.
- Extend by subclassing `ToolHandler(ABC)` with `name`, `description`, `input_schema`, and `handle()`.
- Register new tools in the category module's `register(cfg)` function.
- New categories require a new module and a `_ToolRegistry` entry in `tools/__init__.py`.

## Keep Middleware Composable

- Authentication, rate limiting, and validation flow through `MiddlewareChain`.
- Do not bypass middleware for individual tools.
- Configuration overrides via environment variables (`MCP_API_KEY`, `MCP_RATE_LIMIT`, `MCP_LOG_LEVEL`).

## Validate Carefully

- Run `python -m compileall mcp_server` for compile-time validation.
- Use `python -m mcp_server --log-level DEBUG` for startup smoke testing when dependencies are installed.
- Do not assume external services (Pinecone, Git repos) are available during validation.
