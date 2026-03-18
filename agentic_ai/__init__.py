"""
Agentic AI Pipeline
===================

A sophisticated multi-agent AI system built with LangGraph and LangChain,
featuring an assembly line architecture for complex task execution.

This package provides:
- Multi-agent orchestration with LangGraph
- Assembly line processing architecture
- MCP client for connecting to the standalone Lumina MCP Server
- Production-ready deployment configurations for AWS and Azure
"""

__version__ = "1.1.0"
__author__ = "AI RAG Assistant Team"

from .core.pipeline import AgenticPipeline
from .core.state import PipelineState
from .core.orchestrator import AgentOrchestrator

__all__ = [
    "AgenticPipeline",
    "PipelineState",
    "AgentOrchestrator",
]
