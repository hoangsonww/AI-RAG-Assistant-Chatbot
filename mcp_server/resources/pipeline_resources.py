"""
Pipeline-related resources.
"""

from __future__ import annotations

import json
from typing import Any, Dict

import mcp.types as types

from .base import ResourceHandler


class PipelineConfigResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://pipeline/config",
                name="Pipeline Configuration",
                description="Current agentic pipeline configuration",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        try:
            from agentic_ai.core.pipeline import AgenticPipeline
            pipeline = AgenticPipeline()
            return json.dumps(pipeline.config, indent=2, default=str)
        except ImportError:
            return json.dumps({"note": "agentic_ai not available"}, indent=2)


class PipelineMetricsResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://pipeline/metrics",
                name="Pipeline Metrics",
                description="Aggregated pipeline execution metrics",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        try:
            from agentic_ai.core.pipeline import AgenticPipeline
            pipeline = AgenticPipeline()
            metrics = pipeline.orchestrator.monitor.get_summary()
            return json.dumps(metrics, indent=2, default=str)
        except ImportError:
            return json.dumps({"note": "agentic_ai not available"}, indent=2)


class PipelineAgentsResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://pipeline/agents",
                name="Pipeline Agents",
                description="List of agents in the agentic pipeline with their types and roles",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        agents = [
            {"name": "planner", "role": "Creates execution plans and breaks down complex tasks"},
            {"name": "researcher", "role": "Gathers information from various sources"},
            {"name": "analyzer", "role": "Analyzes data and extracts insights"},
            {"name": "synthesizer", "role": "Combines information into coherent output"},
            {"name": "validator", "role": "Validates quality and completeness"},
            {"name": "executor", "role": "Executes specific actions"},
            {"name": "reviewer", "role": "Final quality review and report generation"},
        ]
        return json.dumps({"agents": agents, "count": len(agents)}, indent=2)


def register(cfg: Any) -> Dict[str, ResourceHandler]:
    handlers = [PipelineConfigResource(), PipelineMetricsResource(), PipelineAgentsResource()]
    return {h.uri: h for h in handlers}
