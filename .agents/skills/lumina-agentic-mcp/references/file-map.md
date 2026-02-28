# Agentic AI File Map

## Entry points

- `agentic_ai/__main__.py`: CLI commands for `run`, `server`, and `visualize`.
- `agentic_ai/core/pipeline.py`: high-level pipeline orchestration.
- `agentic_ai/core/orchestrator.py`: orchestration logic.
- `agentic_ai/core/state.py`: shared pipeline state structures.

## Agents

- `agentic_ai/agents/planner.py`
- `agentic_ai/agents/researcher.py`
- `agentic_ai/agents/analyzer.py`
- `agentic_ai/agents/synthesizer.py`
- `agentic_ai/agents/validator.py`
- `agentic_ai/agents/executor.py`
- `agentic_ai/agents/reviewer.py`

## MCP surface

- `agentic_ai/mcp_server/server.py`: MCP server setup and tool/resource/prompt registration.
- `agentic_ai/mcp_server/handlers.py`: supporting MCP logic.

## Configuration and utils

- `agentic_ai/config/default_config.yaml`
- `agentic_ai/config/production_config.yaml`
- `agentic_ai/utils/logger.py`
- `agentic_ai/utils/monitoring.py`

## Deployments

- `agentic_ai/deployments/aws/`
- `agentic_ai/deployments/azure/`
