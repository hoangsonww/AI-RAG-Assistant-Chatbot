"""
State management for the Agentic AI Pipeline

This module defines the state structures used throughout the agent pipeline,
including pipeline state, agent state, and message history.
"""

from typing import Dict, List, Any, Optional, TypedDict, Annotated
from datetime import datetime
from enum import Enum
import operator


class AgentStatus(str, Enum):
    """Status of an agent in the pipeline"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class AgentType(str, Enum):
    """Types of agents in the system"""
    PLANNER = "planner"
    RESEARCHER = "researcher"
    ANALYZER = "analyzer"
    SYNTHESIZER = "synthesizer"
    VALIDATOR = "validator"
    EXECUTOR = "executor"
    REVIEWER = "reviewer"


class Message(TypedDict):
    """Represents a message in the agent communication"""
    role: str
    content: str
    timestamp: str
    agent_type: Optional[str]
    metadata: Optional[Dict[str, Any]]


class AgentState(TypedDict):
    """State for an individual agent"""
    agent_id: str
    agent_type: AgentType
    status: AgentStatus
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    error: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    metadata: Dict[str, Any]


class PipelineState(TypedDict):
    """
    Central state for the entire pipeline.

    This state is passed between all agents in the graph and accumulates
    information as it flows through the assembly line.
    """
    # Core data
    task: str
    context: Dict[str, Any]

    # Message history - uses operator.add to append messages
    messages: Annotated[List[Message], operator.add]

    # Agent states
    agent_states: Dict[str, AgentState]

    # Pipeline control
    current_step: str
    next_steps: List[str]
    completed_steps: List[str]

    # Results
    intermediate_results: Dict[str, Any]
    final_result: Optional[Dict[str, Any]]

    # Metadata
    pipeline_id: str
    start_time: datetime
    status: AgentStatus

    # Error handling
    errors: List[Dict[str, Any]]
    retry_count: int

    # Configuration
    config: Dict[str, Any]


class PipelineConfig(TypedDict):
    """Configuration for the pipeline"""
    max_retries: int
    timeout_seconds: int
    enable_parallel: bool
    agent_configs: Dict[str, Dict[str, Any]]
    llm_config: Dict[str, Any]
    monitoring: Dict[str, Any]


def create_initial_state(
    task: str,
    context: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None
) -> PipelineState:
    """
    Create an initial pipeline state

    Args:
        task: The task description
        context: Additional context for the task
        config: Pipeline configuration

    Returns:
        Initial PipelineState
    """
    import uuid

    return PipelineState(
        task=task,
        context=context or {},
        messages=[],
        agent_states={},
        current_step="start",
        next_steps=["planner"],
        completed_steps=[],
        intermediate_results={},
        final_result=None,
        pipeline_id=str(uuid.uuid4()),
        start_time=datetime.utcnow(),
        status=AgentStatus.PENDING,
        errors=[],
        retry_count=0,
        config=config or {}
    )


def add_message(
    state: PipelineState,
    role: str,
    content: str,
    agent_type: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Message:
    """
    Create a message and add it to the state

    Args:
        state: Current pipeline state
        role: Role of the message sender
        content: Message content
        agent_type: Type of agent sending the message
        metadata: Additional metadata

    Returns:
        Created message
    """
    message = Message(
        role=role,
        content=content,
        timestamp=datetime.utcnow().isoformat(),
        agent_type=agent_type,
        metadata=metadata or {}
    )
    return message


def update_agent_state(
    state: PipelineState,
    agent_id: str,
    agent_type: AgentType,
    status: AgentStatus,
    output_data: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
) -> None:
    """
    Update the state of an agent in the pipeline

    Args:
        state: Current pipeline state
        agent_id: Unique identifier for the agent
        agent_type: Type of the agent
        status: New status for the agent
        output_data: Output data from the agent
        error: Error message if any
    """
    if agent_id not in state["agent_states"]:
        state["agent_states"][agent_id] = AgentState(
            agent_id=agent_id,
            agent_type=agent_type,
            status=status,
            input_data={},
            output_data=output_data,
            error=error,
            start_time=datetime.utcnow() if status == AgentStatus.RUNNING else None,
            end_time=None,
            metadata={}
        )
    else:
        agent_state = state["agent_states"][agent_id]
        agent_state["status"] = status
        if output_data:
            agent_state["output_data"] = output_data
        if error:
            agent_state["error"] = error
        if status in [AgentStatus.COMPLETED, AgentStatus.FAILED]:
            agent_state["end_time"] = datetime.utcnow()
