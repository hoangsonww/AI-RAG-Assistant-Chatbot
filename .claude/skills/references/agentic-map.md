# Agentic AI Map

## Core orchestration

- `agentic_ai/__main__.py`: command entry points.
- `agentic_ai/core/pipeline.py`: top-level pipeline wrapper.
- `agentic_ai/core/orchestrator.py`: orchestration logic.
- `agentic_ai/core/state.py`: state structures.

## Agents

- `agentic_ai/agents/planner.py`
- `agentic_ai/agents/researcher.py`
- `agentic_ai/agents/analyzer.py`
- `agentic_ai/agents/synthesizer.py`
- `agentic_ai/agents/validator.py`
- `agentic_ai/agents/executor.py`
- `agentic_ai/agents/reviewer.py`

## MCP client

- `agentic_ai/mcp_client/client.py`: MCPClient with direct and stdio modes.
- `agentic_ai/mcp_client/tool_adapter.py`: MCPToolAdapter and per-agent tool mapping.

## Standalone MCP server

- `mcp_server/`: 32 tools, 7 resources, 6 prompts (separate package at repo root).

## Config and deployment

- `agentic_ai/config/default_config.yaml`
- `agentic_ai/config/production_config.yaml`
- `agentic_ai/deployments/aws/`
- `agentic_ai/deployments/azure/`

## Recommended low-risk validation

- `python -m compileall agentic_ai`
