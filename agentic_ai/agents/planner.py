"""
Planner Agent - Creates execution plans for complex tasks
"""

from typing import Dict, Any
from ..core.state import PipelineState, AgentType
from .base import BaseAgent


class PlannerAgent(BaseAgent):
    """
    Planner Agent creates a structured execution plan for the task.

    It analyzes the input task, breaks it down into steps, and determines
    which agents need to be involved and in what order.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.PLANNER, llm, config, tools)

    def _get_role_description(self) -> str:
        return """analyze tasks and create detailed execution plans, breaking down complex
tasks into manageable steps and determining the optimal agent workflow"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Create an execution plan for the task

        Args:
            state: Current pipeline state

        Returns:
            Updated state with execution plan
        """
        self._log_execution_start(state)

        try:
            # Build prompt with task and context
            prompt = self._build_planning_prompt(state)

            # Invoke LLM to create plan
            plan_response = await self._invoke_llm(prompt)

            # Parse and structure the plan
            execution_plan = self._parse_plan(plan_response)

            # Update state with plan
            state["intermediate_results"]["execution_plan"] = execution_plan
            state["next_steps"] = execution_plan.get("agent_sequence", [])

            # Add message to state
            self._add_message(
                state,
                f"Created execution plan with {len(state['next_steps'])} steps",
                metadata={"plan": execution_plan}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"execution_plan": execution_plan}
            )

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Planner agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _build_planning_prompt(self, state: PipelineState) -> str:
        """Build the prompt for planning"""
        available_agents = ["researcher", "analyzer", "synthesizer", "validator", "executor", "reviewer"]

        return f"""
Task: {state['task']}

Context: {state['context']}

Available Agents:
- researcher: Gathers information from various sources
- analyzer: Analyzes data and extracts insights
- synthesizer: Combines information from multiple sources
- validator: Validates results and checks quality
- executor: Executes specific actions or commands
- reviewer: Reviews final outputs for quality

Create a detailed execution plan that:
1. Breaks down the task into logical steps
2. Assigns each step to the appropriate agent
3. Identifies dependencies between steps
4. Estimates the complexity and time for each step

Return your plan in the following JSON format:
{{
    "task_analysis": "Brief analysis of the task",
    "complexity": "low/medium/high",
    "agent_sequence": ["agent1", "agent2", ...],
    "steps": [
        {{
            "step_number": 1,
            "agent": "agent_name",
            "description": "What this step does",
            "dependencies": ["step_numbers this depends on"],
            "expected_output": "What we expect from this step"
        }}
    ],
    "success_criteria": ["criteria1", "criteria2", ...]
}}
"""

    def _parse_plan(self, plan_response: str) -> Dict[str, Any]:
        """Parse the plan response from the LLM"""
        import json
        import re

        try:
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', plan_response, re.DOTALL)
            if json_match:
                plan = json.loads(json_match.group())
                return plan
            else:
                # Fallback: create a simple plan
                return {
                    "task_analysis": plan_response[:200],
                    "complexity": "medium",
                    "agent_sequence": ["researcher", "analyzer", "synthesizer", "validator"],
                    "steps": [],
                    "success_criteria": []
                }
        except json.JSONDecodeError:
            self.logger.warning("Failed to parse plan as JSON, using fallback")
            return {
                "task_analysis": "Plan created",
                "complexity": "medium",
                "agent_sequence": ["researcher", "analyzer", "synthesizer", "validator"],
                "steps": [],
                "success_criteria": []
            }


from datetime import datetime
from ..core.state import AgentStatus, update_agent_state
