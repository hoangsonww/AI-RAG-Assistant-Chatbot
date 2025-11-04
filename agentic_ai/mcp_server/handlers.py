"""
Request handlers for MCP server
"""

from typing import Dict, Any, Optional
from datetime import datetime

from ..core.pipeline import AgenticPipeline
from ..utils.logger import get_logger


class AgentHandler:
    """
    Handler for agent-related requests
    """

    def __init__(self, pipeline: AgenticPipeline):
        """
        Initialize handler

        Args:
            pipeline: AgenticPipeline instance
        """
        self.pipeline = pipeline
        self.logger = get_logger("agent_handler")

    async def get_agent_info(self, agent_name: str) -> Dict[str, Any]:
        """
        Get information about a specific agent

        Args:
            agent_name: Name of the agent

        Returns:
            Agent information
        """
        if agent_name not in self.pipeline.orchestrator.agents:
            return {
                "found": False,
                "message": f"Agent {agent_name} not found"
            }

        agent = self.pipeline.orchestrator.agents[agent_name]

        return {
            "found": True,
            "name": agent_name,
            "type": str(agent.agent_type),
            "config": agent.config,
            "tools_count": len(agent.tools)
        }

    async def list_agents(self) -> Dict[str, Any]:
        """
        List all available agents

        Returns:
            List of agents
        """
        agents = []

        for name, agent in self.pipeline.orchestrator.agents.items():
            agents.append({
                "name": name,
                "type": str(agent.agent_type),
                "enabled": True
            })

        return {
            "total": len(agents),
            "agents": agents
        }

    async def get_agent_metrics(self, agent_name: str) -> Dict[str, Any]:
        """
        Get metrics for a specific agent

        Args:
            agent_name: Name of the agent

        Returns:
            Agent metrics
        """
        metrics = self.pipeline.orchestrator.monitor.get_agent_metrics(agent_name)

        return {
            "agent": agent_name,
            "metrics": metrics
        }


class PipelineHandler:
    """
    Handler for pipeline-related requests
    """

    def __init__(self, pipeline: AgenticPipeline):
        """
        Initialize handler

        Args:
            pipeline: AgenticPipeline instance
        """
        self.pipeline = pipeline
        self.logger = get_logger("pipeline_handler")

    async def get_config(self) -> Dict[str, Any]:
        """
        Get pipeline configuration

        Returns:
            Configuration dictionary
        """
        return {
            "config": self.pipeline.config
        }

    async def update_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update pipeline configuration

        Args:
            config: New configuration

        Returns:
            Status
        """
        try:
            # Merge with existing config
            self.pipeline.config.update(config)

            # Reinitialize orchestrator with new config
            self.pipeline.orchestrator = AgentOrchestrator(self.pipeline.config)

            return {
                "success": True,
                "message": "Configuration updated successfully"
            }

        except Exception as e:
            self.logger.error(f"Failed to update config: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_metrics(self) -> Dict[str, Any]:
        """
        Get pipeline metrics

        Returns:
            Metrics dictionary
        """
        return self.pipeline.orchestrator.monitor.get_summary()

    async def export_metrics(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Export metrics to file

        Args:
            filename: Optional filename

        Returns:
            Status with file path
        """
        try:
            filepath = self.pipeline.orchestrator.monitor.export_metrics(filename)

            return {
                "success": True,
                "filepath": filepath
            }

        except Exception as e:
            self.logger.error(f"Failed to export metrics: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


from ..core.orchestrator import AgentOrchestrator
