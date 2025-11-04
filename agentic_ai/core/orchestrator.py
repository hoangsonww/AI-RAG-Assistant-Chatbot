"""
Agent Orchestrator using LangGraph

This module implements the agent orchestration using LangGraph's StateGraph,
creating an assembly line architecture for agent execution.
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import logging

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from .state import PipelineState, AgentStatus, AgentType, create_initial_state
from ..agents import (
    PlannerAgent,
    ResearcherAgent,
    AnalyzerAgent,
    SynthesizerAgent,
    ValidatorAgent,
    ExecutorAgent,
    ReviewerAgent
)
from ..utils.logger import get_logger
from ..utils.monitoring import PipelineMonitor


class AgentOrchestrator:
    """
    Orchestrates multiple agents using LangGraph's StateGraph.

    The orchestrator creates an assembly line where each agent processes
    the state and passes it to the next agent based on the workflow.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the orchestrator

        Args:
            config: Configuration for the orchestrator and agents
        """
        self.config = config or {}
        self.logger = get_logger("orchestrator")
        self.monitor = PipelineMonitor(self.config.get("monitoring", {}))

        # Initialize LLM
        self.llm = self._initialize_llm()

        # Initialize agents
        self.agents = self._initialize_agents()

        # Build the graph
        self.graph = self._build_graph()

        # Compile the graph
        self.app = self.graph.compile()

        self.logger.info("Agent orchestrator initialized successfully")

    def _initialize_llm(self) -> Any:
        """Initialize the language model"""
        llm_config = self.config.get("llm", {})
        provider = llm_config.get("provider", "openai")
        model = llm_config.get("model", "gpt-4")
        temperature = llm_config.get("temperature", 0.7)

        if provider == "openai":
            return ChatOpenAI(
                model=model,
                temperature=temperature,
                **llm_config.get("params", {})
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model=model,
                temperature=temperature,
                **llm_config.get("params", {})
            )
        else:
            # Default to OpenAI
            return ChatOpenAI(model=model, temperature=temperature)

    def _initialize_agents(self) -> Dict[str, Any]:
        """Initialize all agents"""
        agent_config = self.config.get("agents", {})

        return {
            "planner": PlannerAgent(
                llm=self.llm,
                config=agent_config.get("planner", {}),
                tools=self.config.get("tools", {}).get("planner", [])
            ),
            "researcher": ResearcherAgent(
                llm=self.llm,
                config=agent_config.get("researcher", {}),
                tools=self.config.get("tools", {}).get("researcher", [])
            ),
            "analyzer": AnalyzerAgent(
                llm=self.llm,
                config=agent_config.get("analyzer", {}),
                tools=self.config.get("tools", {}).get("analyzer", [])
            ),
            "synthesizer": SynthesizerAgent(
                llm=self.llm,
                config=agent_config.get("synthesizer", {}),
                tools=self.config.get("tools", {}).get("synthesizer", [])
            ),
            "validator": ValidatorAgent(
                llm=self.llm,
                config=agent_config.get("validator", {}),
                tools=self.config.get("tools", {}).get("validator", [])
            ),
            "executor": ExecutorAgent(
                llm=self.llm,
                config=agent_config.get("executor", {}),
                tools=self.config.get("tools", {}).get("executor", [])
            ),
            "reviewer": ReviewerAgent(
                llm=self.llm,
                config=agent_config.get("reviewer", {}),
                tools=self.config.get("tools", {}).get("reviewer", [])
            )
        }

    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph StateGraph for agent orchestration

        Creates an assembly line architecture where agents are connected
        in a workflow based on the pipeline design.
        """
        # Create the graph
        graph = StateGraph(PipelineState)

        # Add agent nodes
        graph.add_node("planner", self._create_agent_node("planner"))
        graph.add_node("researcher", self._create_agent_node("researcher"))
        graph.add_node("analyzer", self._create_agent_node("analyzer"))
        graph.add_node("synthesizer", self._create_agent_node("synthesizer"))
        graph.add_node("validator", self._create_agent_node("validator"))
        graph.add_node("executor", self._create_agent_node("executor"))
        graph.add_node("reviewer", self._create_agent_node("reviewer"))

        # Add routing node
        graph.add_node("router", self._router)

        # Set entry point
        graph.set_entry_point("planner")

        # Define edges - Assembly line flow
        graph.add_edge("planner", "router")
        graph.add_edge("researcher", "analyzer")
        graph.add_edge("analyzer", "synthesizer")
        graph.add_edge("synthesizer", "validator")
        graph.add_edge("validator", "router")
        graph.add_edge("executor", "reviewer")
        graph.add_edge("reviewer", END)

        # Add conditional edges from router
        graph.add_conditional_edges(
            "router",
            self._route_after_validation,
            {
                "researcher": "researcher",
                "executor": "executor",
                "end": END
            }
        )

        self.logger.info("Graph built successfully")
        return graph

    def _create_agent_node(self, agent_name: str) -> Callable:
        """
        Create a node function for an agent

        Args:
            agent_name: Name of the agent

        Returns:
            Node function
        """
        async def agent_node(state: PipelineState) -> PipelineState:
            """Execute the agent"""
            self.logger.info(f"Executing {agent_name} agent")
            self.monitor.record_agent_start(agent_name, state["pipeline_id"])

            try:
                agent = self.agents[agent_name]
                updated_state = await agent.execute(state)
                updated_state["current_step"] = agent_name
                updated_state["completed_steps"].append(agent_name)

                self.monitor.record_agent_completion(agent_name, state["pipeline_id"])
                return updated_state

            except Exception as e:
                self.logger.error(f"Agent {agent_name} failed: {str(e)}")
                self.monitor.record_agent_error(agent_name, state["pipeline_id"], str(e))

                state["errors"].append({
                    "agent": agent_name,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                state["status"] = AgentStatus.FAILED
                return state

        return agent_node

    def _router(self, state: PipelineState) -> PipelineState:
        """
        Router node that decides the next step

        Args:
            state: Current pipeline state

        Returns:
            Updated state
        """
        self.logger.info("Router: Determining next step")
        return state

    def _route_after_validation(self, state: PipelineState) -> str:
        """
        Conditional routing after validation

        Args:
            state: Current pipeline state

        Returns:
            Next node name
        """
        validation = state.get("intermediate_results", {}).get("validation", {})

        # Check if validation failed and needs retry
        if state.get("intermediate_results", {}).get("needs_retry"):
            if state["retry_count"] < self.config.get("max_retries", 3):
                self.logger.info("Validation failed, retrying from researcher")
                return "researcher"

        # Check if validation passed
        if validation.get("passed", True):
            # Check if execution is needed
            synthesis = state.get("intermediate_results", {}).get("synthesis", {})
            if synthesis.get("actionable_items") or synthesis.get("next_steps"):
                self.logger.info("Routing to executor")
                return "executor"

        # Default: go to end
        self.logger.info("Routing to end")
        return "end"

    async def run(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> PipelineState:
        """
        Run the agent pipeline

        Args:
            task: Task description
            context: Additional context
            config: Pipeline-specific configuration

        Returns:
            Final pipeline state
        """
        self.logger.info(f"Starting pipeline execution for task: {task}")

        # Create initial state
        initial_state = create_initial_state(
            task=task,
            context=context,
            config={**self.config, **(config or {})}
        )

        # Record pipeline start
        self.monitor.record_pipeline_start(initial_state["pipeline_id"])

        try:
            # Run the graph
            final_state = await self.app.ainvoke(initial_state)

            # Update final status
            final_state["status"] = AgentStatus.COMPLETED

            # Record pipeline completion
            self.monitor.record_pipeline_completion(
                final_state["pipeline_id"],
                success=True
            )

            self.logger.info(
                f"Pipeline completed successfully. ID: {final_state['pipeline_id']}"
            )

            return final_state

        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {str(e)}")
            self.monitor.record_pipeline_completion(
                initial_state["pipeline_id"],
                success=False,
                error=str(e)
            )
            raise

    async def stream(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Stream the agent pipeline execution

        Args:
            task: Task description
            context: Additional context
            config: Pipeline-specific configuration

        Yields:
            State updates as the pipeline executes
        """
        self.logger.info(f"Starting streaming pipeline execution for task: {task}")

        # Create initial state
        initial_state = create_initial_state(
            task=task,
            context=context,
            config={**self.config, **(config or {})}
        )

        # Record pipeline start
        self.monitor.record_pipeline_start(initial_state["pipeline_id"])

        try:
            # Stream the graph execution
            async for state in self.app.astream(initial_state):
                yield state

            self.logger.info("Pipeline streaming completed")

        except Exception as e:
            self.logger.error(f"Pipeline streaming failed: {str(e)}")
            self.monitor.record_pipeline_completion(
                initial_state["pipeline_id"],
                success=False,
                error=str(e)
            )
            raise

    def get_graph_visualization(self) -> str:
        """
        Get a Mermaid diagram of the graph

        Returns:
            Mermaid diagram string
        """
        try:
            return self.app.get_graph().draw_mermaid()
        except Exception as e:
            self.logger.error(f"Failed to generate graph visualization: {str(e)}")
            return "Graph visualization not available"
