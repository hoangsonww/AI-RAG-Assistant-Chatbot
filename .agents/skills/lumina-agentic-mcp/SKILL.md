---
name: lumina-agentic-mcp
description: Work on the Python multi-agent pipeline and MCP server in agentic_ai. Use when editing files under agentic_ai/, changing agent orchestration, configuration loading, MCP tools/resources/prompts, async execution flow, pipeline startup commands, or cloud deployment wrappers for the Python service.
---

# Lumina Agentic Mcp

## Overview

Use this skill for the Python subsystem under `agentic_ai/`. Keep changes consistent with the existing config-driven, async, multi-agent design rather than turning it into a one-off script.

## Load The Right Reference

- Read `references/file-map.md` when you need to locate the pipeline, agent, config, or MCP surface that owns a behavior.
- Read `references/commands.md` before finishing so validation and startup commands match the subsystem.

## Preserve The Existing Architecture

- Keep pipeline behavior flowing through `core/`, `agents/`, and `mcp_server/` rather than duplicating logic.
- Respect async boundaries and existing command entry points in `agentic_ai/__main__.py`.
- Keep the MCP server contract explicit when changing tool names, prompt names, or resource URIs.
- Preserve configuration-driven behavior through files in `agentic_ai/config/`.

## Validate With What The Repo Actually Supports

- Prefer `python -m compileall agentic_ai` for low-friction validation when dependencies or tests are unavailable.
- Use targeted CLI smoke checks such as `python -m agentic_ai visualize` or `python -m agentic_ai run --task "..."` only when the environment is ready.
- Do not assume `pytest` is runnable just because it appears in `requirements.txt`; verify the test target exists first.
