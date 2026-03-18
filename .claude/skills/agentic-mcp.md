---
name: agentic-mcp
description: Use when changing the Python multi-agent pipeline or MCP client under agentic_ai/, including orchestration, agent flow, configuration loading, MCP client connectivity, per-agent tool mapping, or the Python deployment wrappers for that subsystem.
---

# Agentic MCP

Use this skill for the Python subsystem in `agentic_ai/`.

## First read

- `@agentic_ai/CLAUDE.md`
- `@agentic_ai/README.md`
- `@.claude/skills/references/agentic-map.md`

## Workflow

1. Keep pipeline behavior flowing through `core/`, `agents/`, and `mcp_client/` rather than adding one-off bypass logic.
2. Respect async execution boundaries and command entry points in `agentic_ai/__main__.py`.
3. Preserve config-driven behavior through files in `agentic_ai/config/`.
4. When changing MCP tools or prompt names, treat those as external contracts and rename carefully.

## Validation

- Run `python -m compileall agentic_ai`.
- Only run `python -m agentic_ai ...` commands when dependencies and secrets are available.

## Common traps

- README examples reference `pytest`, but the current tree may not contain the implied test suite.
- Cloud deployment wrappers under `agentic_ai/deployments/` are environment-specific and should not be rewritten casually.
