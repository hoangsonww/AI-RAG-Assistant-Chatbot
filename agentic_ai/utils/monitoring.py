"""
Monitoring and metrics collection for the Agentic AI Pipeline
"""

from typing import Dict, Any, Optional
from datetime import datetime
from collections import defaultdict
import json
from pathlib import Path

from .logger import get_logger


class PipelineMonitor:
    """
    Monitors pipeline execution and collects metrics
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the monitor

        Args:
            config: Monitoring configuration
        """
        self.config = config or {}
        self.logger = get_logger("monitor")
        self.enabled = self.config.get("enabled", True)

        # Metrics storage
        self.metrics = {
            "pipelines": {},
            "agents": defaultdict(lambda: {
                "executions": 0,
                "successes": 0,
                "failures": 0,
                "total_duration": 0
            }),
            "total_pipelines": 0,
            "total_successes": 0,
            "total_failures": 0
        }

        # Export path
        self.export_path = self.config.get(
            "export_path",
            "logs/metrics"
        )
        Path(self.export_path).mkdir(parents=True, exist_ok=True)

    def record_pipeline_start(self, pipeline_id: str) -> None:
        """
        Record pipeline start

        Args:
            pipeline_id: Pipeline identifier
        """
        if not self.enabled:
            return

        self.metrics["pipelines"][pipeline_id] = {
            "start_time": datetime.utcnow().isoformat(),
            "end_time": None,
            "status": "running",
            "agents": {},
            "errors": []
        }

        self.metrics["total_pipelines"] += 1
        self.logger.debug(f"Pipeline started: {pipeline_id}")

    def record_pipeline_completion(
        self,
        pipeline_id: str,
        success: bool = True,
        error: Optional[str] = None
    ) -> None:
        """
        Record pipeline completion

        Args:
            pipeline_id: Pipeline identifier
            success: Whether pipeline completed successfully
            error: Error message if failed
        """
        if not self.enabled:
            return

        if pipeline_id in self.metrics["pipelines"]:
            pipeline = self.metrics["pipelines"][pipeline_id]
            pipeline["end_time"] = datetime.utcnow().isoformat()
            pipeline["status"] = "success" if success else "failed"

            if error:
                pipeline["errors"].append({
                    "error": error,
                    "timestamp": datetime.utcnow().isoformat()
                })

            if success:
                self.metrics["total_successes"] += 1
            else:
                self.metrics["total_failures"] += 1

            # Calculate duration
            if pipeline["start_time"]:
                start = datetime.fromisoformat(pipeline["start_time"])
                end = datetime.fromisoformat(pipeline["end_time"])
                duration = (end - start).total_seconds()
                pipeline["duration"] = duration

            self.logger.debug(
                f"Pipeline completed: {pipeline_id} | "
                f"Status: {pipeline['status']}"
            )

    def record_agent_start(self, agent_name: str, pipeline_id: str) -> None:
        """
        Record agent execution start

        Args:
            agent_name: Name of the agent
            pipeline_id: Pipeline identifier
        """
        if not self.enabled:
            return

        if pipeline_id in self.metrics["pipelines"]:
            self.metrics["pipelines"][pipeline_id]["agents"][agent_name] = {
                "start_time": datetime.utcnow().isoformat(),
                "end_time": None,
                "status": "running"
            }

        self.metrics["agents"][agent_name]["executions"] += 1

    def record_agent_completion(self, agent_name: str, pipeline_id: str) -> None:
        """
        Record agent execution completion

        Args:
            agent_name: Name of the agent
            pipeline_id: Pipeline identifier
        """
        if not self.enabled:
            return

        if pipeline_id in self.metrics["pipelines"]:
            agent = self.metrics["pipelines"][pipeline_id]["agents"].get(agent_name)
            if agent:
                agent["end_time"] = datetime.utcnow().isoformat()
                agent["status"] = "completed"

                # Calculate duration
                if agent["start_time"]:
                    start = datetime.fromisoformat(agent["start_time"])
                    end = datetime.fromisoformat(agent["end_time"])
                    duration = (end - start).total_seconds()
                    agent["duration"] = duration

                    # Update aggregate metrics
                    self.metrics["agents"][agent_name]["total_duration"] += duration

        self.metrics["agents"][agent_name]["successes"] += 1

    def record_agent_error(
        self,
        agent_name: str,
        pipeline_id: str,
        error: str
    ) -> None:
        """
        Record agent execution error

        Args:
            agent_name: Name of the agent
            pipeline_id: Pipeline identifier
            error: Error message
        """
        if not self.enabled:
            return

        if pipeline_id in self.metrics["pipelines"]:
            agent = self.metrics["pipelines"][pipeline_id]["agents"].get(agent_name)
            if agent:
                agent["end_time"] = datetime.utcnow().isoformat()
                agent["status"] = "failed"
                agent["error"] = error

        self.metrics["agents"][agent_name]["failures"] += 1

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get all collected metrics

        Returns:
            Metrics dictionary
        """
        return self.metrics

    def get_agent_metrics(self, agent_name: str) -> Dict[str, Any]:
        """
        Get metrics for a specific agent

        Args:
            agent_name: Name of the agent

        Returns:
            Agent metrics
        """
        metrics = self.metrics["agents"][agent_name]

        # Calculate average duration
        if metrics["executions"] > 0:
            metrics["avg_duration"] = (
                metrics["total_duration"] / metrics["executions"]
            )
            metrics["success_rate"] = (
                metrics["successes"] / metrics["executions"]
            )
        else:
            metrics["avg_duration"] = 0
            metrics["success_rate"] = 0

        return dict(metrics)

    def get_pipeline_metrics(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """
        Get metrics for a specific pipeline

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            Pipeline metrics or None if not found
        """
        return self.metrics["pipelines"].get(pipeline_id)

    def export_metrics(self, filename: Optional[str] = None) -> str:
        """
        Export metrics to JSON file

        Args:
            filename: Optional filename (defaults to timestamp)

        Returns:
            Path to exported file
        """
        if filename is None:
            filename = f"metrics_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

        filepath = Path(self.export_path) / filename

        try:
            with open(filepath, 'w') as f:
                json.dump(self.metrics, f, indent=2, default=str)

            self.logger.info(f"Metrics exported to {filepath}")
            return str(filepath)

        except Exception as e:
            self.logger.error(f"Failed to export metrics: {str(e)}")
            raise

    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of metrics

        Returns:
            Summary dictionary
        """
        total_pipelines = self.metrics["total_pipelines"]
        total_successes = self.metrics["total_successes"]
        total_failures = self.metrics["total_failures"]

        success_rate = (
            total_successes / total_pipelines if total_pipelines > 0 else 0
        )

        # Agent summaries
        agent_summaries = {}
        for agent_name, metrics in self.metrics["agents"].items():
            if metrics["executions"] > 0:
                agent_summaries[agent_name] = {
                    "executions": metrics["executions"],
                    "success_rate": metrics["successes"] / metrics["executions"],
                    "avg_duration": metrics["total_duration"] / metrics["executions"]
                }

        return {
            "total_pipelines": total_pipelines,
            "total_successes": total_successes,
            "total_failures": total_failures,
            "success_rate": success_rate,
            "agents": agent_summaries
        }

    def reset_metrics(self) -> None:
        """Reset all metrics"""
        self.metrics = {
            "pipelines": {},
            "agents": defaultdict(lambda: {
                "executions": 0,
                "successes": 0,
                "failures": 0,
                "total_duration": 0
            }),
            "total_pipelines": 0,
            "total_successes": 0,
            "total_failures": 0
        }
        self.logger.info("Metrics reset")
