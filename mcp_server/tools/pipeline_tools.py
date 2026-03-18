"""
Pipeline management tools — run, monitor, and control agentic pipelines.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import mcp.types as types

from .base import ToolHandler
from ..utils.logger import get_logger

_logger = get_logger("tools.pipeline")

# In-memory store for pipeline results (production would use a DB)
_pipeline_runs: Dict[str, Dict[str, Any]] = {}


class RunPipelineTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="run_pipeline",
                description=(
                    "Run the Lumina agentic AI pipeline for a given task. "
                    "Returns a pipeline_id and the full result once complete."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "task": {
                            "type": "string",
                            "description": "The task description to execute",
                        },
                        "context": {
                            "type": "object",
                            "description": "Optional additional context for the task",
                            "additionalProperties": True,
                        },
                        "config_path": {
                            "type": "string",
                            "description": "Optional path to pipeline config YAML",
                        },
                    },
                    "required": ["task"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        task = arguments["task"]
        context = arguments.get("context", {})
        config_path = arguments.get("config_path")

        _logger.info("Running pipeline for task: %s", task[:120])

        try:
            from agentic_ai.core.pipeline import AgenticPipeline

            pipeline = AgenticPipeline(config_path=config_path)
            result = await pipeline.run(task=task, context=context)
            pid = result.get("pipeline_id", str(uuid.uuid4()))
            _pipeline_runs[pid] = {
                "result": result,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return {"success": True, "pipeline_id": pid, "result": result}
        except ImportError:
            _logger.warning("agentic_ai package not available — returning stub")
            pid = str(uuid.uuid4())
            _pipeline_runs[pid] = {
                "result": {"stub": True, "task": task},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return {
                "success": False,
                "pipeline_id": pid,
                "error": "agentic_ai not installed or not importable",
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}


class GetPipelineStatusTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="get_pipeline_status",
                description="Get the status and result of a previously run pipeline.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pipeline_id": {
                            "type": "string",
                            "description": "The pipeline identifier",
                        }
                    },
                    "required": ["pipeline_id"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        pid = arguments["pipeline_id"]
        if pid in _pipeline_runs:
            return {"found": True, "pipeline": _pipeline_runs[pid]}
        return {"found": False, "message": f"Pipeline {pid} not found"}


class ListPipelinesTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="list_pipelines",
                description="List all pipeline runs tracked in this session.",
                inputSchema={"type": "object", "properties": {}},
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        pipelines = [
            {
                "pipeline_id": pid,
                "timestamp": data["timestamp"],
                "success": data["result"].get("success", False),
            }
            for pid, data in _pipeline_runs.items()
        ]
        return {"total": len(pipelines), "pipelines": pipelines}


class CancelPipelineTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="cancel_pipeline",
                description="Cancel / remove a pipeline run from tracking.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pipeline_id": {
                            "type": "string",
                            "description": "The pipeline identifier to cancel",
                        }
                    },
                    "required": ["pipeline_id"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        pid = arguments["pipeline_id"]
        if pid in _pipeline_runs:
            del _pipeline_runs[pid]
            return {"cancelled": True, "pipeline_id": pid}
        return {"cancelled": False, "message": f"Pipeline {pid} not found"}


class GetGraphVisualizationTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="get_pipeline_graph",
                description="Get a Mermaid diagram of the agentic pipeline graph.",
                inputSchema={"type": "object", "properties": {}},
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        try:
            from agentic_ai.core.pipeline import AgenticPipeline

            pipeline = AgenticPipeline()
            graph = pipeline.get_graph_visualization()
            return {"success": True, "graph": graph, "format": "mermaid"}
        except ImportError:
            return {
                "success": False,
                "error": "agentic_ai not installed",
                "graph": (
                    "graph TD\n"
                    "  planner-->researcher\n"
                    "  researcher-->analyzer\n"
                    "  analyzer-->synthesizer\n"
                    "  synthesizer-->validator\n"
                    "  validator-->executor\n"
                    "  executor-->reviewer"
                ),
                "format": "mermaid",
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {
        h.name: h
        for h in [
            RunPipelineTool(),
            GetPipelineStatusTool(),
            ListPipelinesTool(),
            CancelPipelineTool(),
            GetGraphVisualizationTool(),
        ]
    }
