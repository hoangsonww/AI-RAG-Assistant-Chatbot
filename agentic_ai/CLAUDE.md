# Agentic AI Guide

## Scope

- `agentic_ai/core/`: pipeline, orchestrator, state handling.
- `agentic_ai/agents/`: planner, researcher, analyzer, synthesizer, validator, executor, reviewer.
- `agentic_ai/mcp_client/`: MCP client that connects to the standalone `mcp_server/` package.
- `agentic_ai/config/`: default and production YAML configuration.
- `agentic_ai/deployments/`: AWS and Azure deployment wrappers.
- `mcp_server/`: Standalone MCP server (extracted from the old `agentic_ai/mcp_server/`).

## Rules

- Keep behavior config-driven rather than hardcoding environment-specific values.
- Preserve async boundaries and pipeline flow through `core/` and `agents/`.
- When changing MCP tools, prompts, or resources, keep names and schemas deliberate because downstream clients may depend on them.
- The MCP server is now a standalone package at `mcp_server/`. The agentic pipeline connects to it via `mcp_client/`.
- Do not assume the README's `pytest` examples are runnable in the current tree; verify test files exist first.

## Validation

- Prefer `python -m compileall agentic_ai`.
- Use runtime checks such as `python -m agentic_ai visualize` or `python -m agentic_ai run --task "..."` only when dependencies are installed and any required secrets are available.
