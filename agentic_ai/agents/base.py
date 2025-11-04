"""
Base Agent class for the Agentic AI Pipeline

All agents inherit from this base class and implement the execute method.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from ..core.state import PipelineState, AgentStatus, AgentType, add_message, update_agent_state
from ..utils.logger import get_logger


class BaseAgent(ABC):
    """
    Base class for all agents in the pipeline

    Each agent is responsible for a specific task in the assembly line
    and can communicate with other agents through the shared state.
    """

    def __init__(
        self,
        agent_type: AgentType,
        llm: Any,
        config: Optional[Dict[str, Any]] = None,
        tools: Optional[List[Any]] = None
    ):
        """
        Initialize the agent

        Args:
            agent_type: Type of the agent
            llm: Language model instance
            config: Agent-specific configuration
            tools: List of tools available to the agent
        """
        self.agent_type = agent_type
        self.llm = llm
        self.config = config or {}
        self.tools = tools or []
        self.logger = get_logger(f"agent.{agent_type.value}")
        self.agent_id = f"{agent_type.value}_{datetime.utcnow().timestamp()}"

    @abstractmethod
    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Execute the agent's task

        Args:
            state: Current pipeline state

        Returns:
            Updated pipeline state
        """
        pass

    def _create_system_prompt(self) -> str:
        """Create the system prompt for this agent"""
        return f"""You are a {self.agent_type.value} agent in a multi-agent AI system.
Your role is to {self._get_role_description()}.
Work collaboratively with other agents and provide clear, actionable outputs."""

    @abstractmethod
    def _get_role_description(self) -> str:
        """Get the role description for this agent"""
        pass

    def _log_execution_start(self, state: PipelineState) -> None:
        """Log the start of agent execution"""
        self.logger.info(
            f"Agent {self.agent_id} starting execution",
            extra={
                "pipeline_id": state["pipeline_id"],
                "agent_type": self.agent_type.value,
                "task": state["task"]
            }
        )
        update_agent_state(
            state,
            self.agent_id,
            self.agent_type,
            AgentStatus.RUNNING
        )

    def _log_execution_end(
        self,
        state: PipelineState,
        success: bool,
        error: Optional[str] = None
    ) -> None:
        """Log the end of agent execution"""
        status = AgentStatus.COMPLETED if success else AgentStatus.FAILED
        self.logger.info(
            f"Agent {self.agent_id} finished execution",
            extra={
                "pipeline_id": state["pipeline_id"],
                "agent_type": self.agent_type.value,
                "status": status.value,
                "error": error
            }
        )
        update_agent_state(
            state,
            self.agent_id,
            self.agent_type,
            status,
            error=error
        )

    def _add_message(
        self,
        state: PipelineState,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add a message to the pipeline state"""
        message = add_message(
            state,
            role="agent",
            content=content,
            agent_type=self.agent_type.value,
            metadata=metadata
        )
        # Manually append since we're not using the graph reducer yet
        state["messages"].append(message)

    def _get_context_from_previous_agents(self, state: PipelineState) -> Dict[str, Any]:
        """Extract relevant context from previous agents' outputs"""
        context = {}
        for agent_id, agent_state in state["agent_states"].items():
            if agent_state["status"] == AgentStatus.COMPLETED and agent_state["output_data"]:
                context[agent_state["agent_type"]] = agent_state["output_data"]
        return context

    async def _invoke_llm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Invoke the language model

        Args:
            prompt: User prompt
            system_prompt: System prompt (uses default if not provided)

        Returns:
            LLM response
        """
        try:
            messages = [
                {"role": "system", "content": system_prompt or self._create_system_prompt()},
                {"role": "user", "content": prompt}
            ]

            # Handle both LangChain and direct API calls
            if hasattr(self.llm, "ainvoke"):
                response = await self.llm.ainvoke(messages)
                return response.content if hasattr(response, "content") else str(response)
            elif hasattr(self.llm, "invoke"):
                response = self.llm.invoke(messages)
                return response.content if hasattr(response, "content") else str(response)
            else:
                # Fallback for direct OpenAI client
                response = await self.llm.chat.completions.create(
                    messages=messages,
                    **self.config.get("llm_params", {})
                )
                return response.choices[0].message.content

        except Exception as e:
            self.logger.error(f"Error invoking LLM: {str(e)}")
            raise

    def _should_skip(self, state: PipelineState) -> bool:
        """
        Determine if this agent should be skipped based on state

        Args:
            state: Current pipeline state

        Returns:
            True if agent should be skipped
        """
        # Check if there are any conditions for skipping
        skip_conditions = self.config.get("skip_conditions", [])
        for condition in skip_conditions:
            if self._evaluate_condition(condition, state):
                return True
        return False

    def _evaluate_condition(self, condition: str, state: PipelineState) -> bool:
        """Evaluate a skip condition"""
        # Simple condition evaluation - can be extended
        # For now, check if a specific key exists in state
        return condition in state.get("intermediate_results", {})
