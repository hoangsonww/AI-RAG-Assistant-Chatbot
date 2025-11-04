"""
MCP Server implementation for the Agentic AI Pipeline

This module implements a Model Context Protocol (MCP) server that exposes
the agentic AI pipeline as a service.
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types

from ..core.pipeline import AgenticPipeline
from ..utils.logger import get_logger


class AgenticMCPServer:
    """
    MCP Server for Agentic AI Pipeline

    Exposes the agentic AI system through the Model Context Protocol,
    allowing it to be used by MCP-compatible clients.
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the MCP server

        Args:
            config_path: Path to configuration file
        """
        self.logger = get_logger("mcp_server")
        self.server = Server("agentic-ai-pipeline")

        # Initialize pipeline
        self.pipeline = AgenticPipeline(config_path=config_path) if config_path else AgenticPipeline()

        # Active pipelines
        self.active_pipelines: Dict[str, Any] = {}

        # Register handlers
        self._register_handlers()

        self.logger.info("MCP Server initialized")

    def _register_handlers(self) -> None:
        """Register MCP handlers"""

        @self.server.list_tools()
        async def handle_list_tools() -> List[types.Tool]:
            """List available tools"""
            return [
                types.Tool(
                    name="run_pipeline",
                    description="Run the agentic AI pipeline for a task",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "task": {
                                "type": "string",
                                "description": "The task to execute"
                            },
                            "context": {
                                "type": "object",
                                "description": "Additional context for the task",
                                "additionalProperties": True
                            }
                        },
                        "required": ["task"]
                    }
                ),
                types.Tool(
                    name="get_pipeline_status",
                    description="Get the status of a running pipeline",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "pipeline_id": {
                                "type": "string",
                                "description": "Pipeline identifier"
                            }
                        },
                        "required": ["pipeline_id"]
                    }
                ),
                types.Tool(
                    name="list_pipelines",
                    description="List all active pipelines",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                types.Tool(
                    name="get_graph_visualization",
                    description="Get a visual representation of the pipeline graph",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(
            name: str,
            arguments: Dict[str, Any]
        ) -> List[types.TextContent]:
            """Handle tool calls"""
            try:
                if name == "run_pipeline":
                    result = await self._handle_run_pipeline(arguments)
                elif name == "get_pipeline_status":
                    result = await self._handle_get_status(arguments)
                elif name == "list_pipelines":
                    result = await self._handle_list_pipelines(arguments)
                elif name == "get_graph_visualization":
                    result = await self._handle_get_graph(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")

                return [
                    types.TextContent(
                        type="text",
                        text=json.dumps(result, indent=2, default=str)
                    )
                ]

            except Exception as e:
                self.logger.error(f"Tool execution failed: {str(e)}")
                return [
                    types.TextContent(
                        type="text",
                        text=json.dumps({
                            "error": str(e),
                            "tool": name
                        }, indent=2)
                    )
                ]

        @self.server.list_resources()
        async def handle_list_resources() -> List[types.Resource]:
            """List available resources"""
            return [
                types.Resource(
                    uri="agentic://pipeline/config",
                    name="Pipeline Configuration",
                    description="Current pipeline configuration",
                    mimeType="application/json"
                ),
                types.Resource(
                    uri="agentic://pipeline/metrics",
                    name="Pipeline Metrics",
                    description="Pipeline execution metrics",
                    mimeType="application/json"
                )
            ]

        @self.server.read_resource()
        async def handle_read_resource(uri: str) -> str:
            """Read a resource"""
            if uri == "agentic://pipeline/config":
                return json.dumps(self.pipeline.config, indent=2, default=str)
            elif uri == "agentic://pipeline/metrics":
                metrics = self.pipeline.orchestrator.monitor.get_summary()
                return json.dumps(metrics, indent=2, default=str)
            else:
                raise ValueError(f"Unknown resource: {uri}")

        @self.server.list_prompts()
        async def handle_list_prompts() -> List[types.Prompt]:
            """List available prompts"""
            return [
                types.Prompt(
                    name="analyze_task",
                    description="Analyze a task and create an execution plan",
                    arguments=[
                        types.PromptArgument(
                            name="task",
                            description="The task to analyze",
                            required=True
                        )
                    ]
                ),
                types.Prompt(
                    name="research_topic",
                    description="Research a topic comprehensively",
                    arguments=[
                        types.PromptArgument(
                            name="topic",
                            description="The topic to research",
                            required=True
                        )
                    ]
                )
            ]

        @self.server.get_prompt()
        async def handle_get_prompt(
            name: str,
            arguments: Dict[str, str]
        ) -> types.GetPromptResult:
            """Get a prompt"""
            if name == "analyze_task":
                task = arguments.get("task", "")
                return types.GetPromptResult(
                    description="Analyze and create execution plan",
                    messages=[
                        types.PromptMessage(
                            role="user",
                            content=types.TextContent(
                                type="text",
                                text=f"Analyze this task and create a detailed execution plan: {task}"
                            )
                        )
                    ]
                )
            elif name == "research_topic":
                topic = arguments.get("topic", "")
                return types.GetPromptResult(
                    description="Research topic comprehensively",
                    messages=[
                        types.PromptMessage(
                            role="user",
                            content=types.TextContent(
                                type="text",
                                text=f"Research this topic comprehensively: {topic}"
                            )
                        )
                    ]
                )
            else:
                raise ValueError(f"Unknown prompt: {name}")

    async def _handle_run_pipeline(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle run_pipeline tool call"""
        task = arguments.get("task")
        context = arguments.get("context", {})

        if not task:
            raise ValueError("Task is required")

        self.logger.info(f"Running pipeline for task: {task[:100]}")

        try:
            result = await self.pipeline.run(task=task, context=context)
            self.active_pipelines[result["pipeline_id"]] = {
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            }

            return {
                "success": True,
                "pipeline_id": result["pipeline_id"],
                "result": result
            }

        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _handle_get_status(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle get_pipeline_status tool call"""
        pipeline_id = arguments.get("pipeline_id")

        if not pipeline_id:
            raise ValueError("Pipeline ID is required")

        if pipeline_id in self.active_pipelines:
            return {
                "found": True,
                "pipeline": self.active_pipelines[pipeline_id]
            }
        else:
            return {
                "found": False,
                "message": f"Pipeline {pipeline_id} not found"
            }

    async def _handle_list_pipelines(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle list_pipelines tool call"""
        pipelines = []

        for pipeline_id, data in self.active_pipelines.items():
            pipelines.append({
                "pipeline_id": pipeline_id,
                "timestamp": data["timestamp"],
                "success": data["result"].get("success", False)
            })

        return {
            "total": len(pipelines),
            "pipelines": pipelines
        }

    async def _handle_get_graph(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle get_graph_visualization tool call"""
        try:
            graph = self.pipeline.get_graph_visualization()
            return {
                "success": True,
                "graph": graph,
                "format": "mermaid"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def run(self) -> None:
        """Run the MCP server"""
        self.logger.info("Starting MCP server...")

        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="agentic-ai-pipeline",
                    server_version="1.0.0",
                    capabilities=self.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={}
                    )
                )
            )


async def main():
    """Main entry point for MCP server"""
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="Agentic AI MCP Server")
    parser.add_argument(
        "--config",
        type=str,
        help="Path to configuration file",
        default=None
    )
    args = parser.parse_args()

    server = AgenticMCPServer(config_path=args.config)
    await server.run()


if __name__ == "__main__":
    asyncio.run(main())
