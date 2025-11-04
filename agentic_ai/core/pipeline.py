"""
Main Agentic AI Pipeline

This module provides the main interface for the agentic AI pipeline.
"""

from typing import Dict, Any, Optional, AsyncIterator
import yaml
import json
from pathlib import Path

from .orchestrator import AgentOrchestrator
from .state import PipelineState
from ..utils.logger import get_logger


class AgenticPipeline:
    """
    Main interface for the Agentic AI Pipeline

    This class provides a high-level API for running the multi-agent
    AI system with various configuration options.
    """

    def __init__(
        self,
        config_path: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the pipeline

        Args:
            config_path: Path to configuration file (YAML or JSON)
            config: Configuration dictionary (overrides config_path)
        """
        self.logger = get_logger("pipeline")

        # Load configuration
        if config:
            self.config = config
        elif config_path:
            self.config = self._load_config(config_path)
        else:
            self.config = self._get_default_config()

        # Initialize orchestrator
        self.orchestrator = AgentOrchestrator(self.config)

        self.logger.info("Agentic AI Pipeline initialized")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from file"""
        path = Path(config_path)

        if not path.exists():
            self.logger.warning(f"Config file not found: {config_path}, using defaults")
            return self._get_default_config()

        try:
            with open(path, 'r') as f:
                if path.suffix in ['.yaml', '.yml']:
                    config = yaml.safe_load(f)
                elif path.suffix == '.json':
                    config = json.load(f)
                else:
                    raise ValueError(f"Unsupported config format: {path.suffix}")

            self.logger.info(f"Loaded configuration from {config_path}")
            return config

        except Exception as e:
            self.logger.error(f"Failed to load config: {str(e)}")
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "llm": {
                "provider": "openai",
                "model": "gpt-4",
                "temperature": 0.7
            },
            "agents": {
                "planner": {"enabled": True},
                "researcher": {"enabled": True},
                "analyzer": {"enabled": True},
                "synthesizer": {"enabled": True},
                "validator": {"enabled": True, "min_score": 0.7},
                "executor": {"enabled": True},
                "reviewer": {"enabled": True}
            },
            "pipeline": {
                "max_retries": 3,
                "timeout_seconds": 300,
                "enable_parallel": False
            },
            "monitoring": {
                "enabled": True,
                "log_level": "INFO"
            }
        }

    async def run(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run the pipeline for a task

        Args:
            task: Task description
            context: Additional context for the task
            **kwargs: Additional configuration options

        Returns:
            Final result dictionary
        """
        self.logger.info(f"Running pipeline for task: {task[:100]}...")

        try:
            # Merge kwargs into config
            run_config = {**self.config, **kwargs}

            # Run orchestrator
            final_state = await self.orchestrator.run(
                task=task,
                context=context,
                config=run_config
            )

            # Extract and return final result
            result = self._extract_result(final_state)

            self.logger.info("Pipeline execution completed successfully")
            return result

        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {str(e)}")
            raise

    async def stream(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream pipeline execution

        Args:
            task: Task description
            context: Additional context for the task
            **kwargs: Additional configuration options

        Yields:
            State updates as the pipeline executes
        """
        self.logger.info(f"Starting streaming pipeline for task: {task[:100]}...")

        try:
            # Merge kwargs into config
            run_config = {**self.config, **kwargs}

            # Stream orchestrator
            async for state in self.orchestrator.stream(
                task=task,
                context=context,
                config=run_config
            ):
                yield self._extract_stream_update(state)

        except Exception as e:
            self.logger.error(f"Pipeline streaming failed: {str(e)}")
            raise

    def _extract_result(self, state: PipelineState) -> Dict[str, Any]:
        """Extract final result from pipeline state"""
        final_result = state.get("final_result", {})

        return {
            "success": state["status"].value == "completed",
            "pipeline_id": state["pipeline_id"],
            "task": state["task"],
            "result": final_result,
            "summary": final_result.get("summary", ""),
            "detailed_output": final_result.get("detailed_output", ""),
            "quality_score": final_result.get("quality_score", 0),
            "key_takeaways": final_result.get("key_takeaways", []),
            "recommendations": final_result.get("recommendations", []),
            "agents_executed": len(state["completed_steps"]),
            "errors": state["errors"],
            "metadata": {
                "start_time": state["start_time"].isoformat() if hasattr(state["start_time"], 'isoformat') else str(state["start_time"]),
                "completed_steps": state["completed_steps"],
                "retry_count": state["retry_count"]
            }
        }

    def _extract_stream_update(self, state_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Extract streaming update from state"""
        # Get the actual state from the dict (LangGraph wraps it)
        state = state_dict

        current_step = state.get("current_step", "unknown")
        messages = state.get("messages", [])
        latest_message = messages[-1] if messages else None

        return {
            "pipeline_id": state.get("pipeline_id"),
            "current_step": current_step,
            "completed_steps": state.get("completed_steps", []),
            "status": state.get("status", {}).get("value", "unknown") if isinstance(state.get("status"), dict) else str(state.get("status", "unknown")),
            "latest_message": latest_message,
            "errors": state.get("errors", [])
        }

    def get_graph_visualization(self) -> str:
        """
        Get a visual representation of the pipeline graph

        Returns:
            Mermaid diagram string
        """
        return self.orchestrator.get_graph_visualization()

    def save_config(self, output_path: str) -> None:
        """
        Save current configuration to file

        Args:
            output_path: Path to save configuration
        """
        path = Path(output_path)

        try:
            with open(path, 'w') as f:
                if path.suffix in ['.yaml', '.yml']:
                    yaml.dump(self.config, f, default_flow_style=False)
                elif path.suffix == '.json':
                    json.dump(self.config, f, indent=2)
                else:
                    raise ValueError(f"Unsupported format: {path.suffix}")

            self.logger.info(f"Configuration saved to {output_path}")

        except Exception as e:
            self.logger.error(f"Failed to save config: {str(e)}")
            raise

    @staticmethod
    def from_config_file(config_path: str) -> "AgenticPipeline":
        """
        Create pipeline from configuration file

        Args:
            config_path: Path to configuration file

        Returns:
            AgenticPipeline instance
        """
        return AgenticPipeline(config_path=config_path)

    @staticmethod
    def from_dict(config: Dict[str, Any]) -> "AgenticPipeline":
        """
        Create pipeline from configuration dictionary

        Args:
            config: Configuration dictionary

        Returns:
            AgenticPipeline instance
        """
        return AgenticPipeline(config=config)
